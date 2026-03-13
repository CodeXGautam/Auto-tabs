/**
 * backend/src/routes/analysis.ts — Main analysis API route
 *
 * POST /api/analyze
 *   1. Validates the form input from the frontend (Zod)
 *   2. Builds the LLM prompt with embedded IS code tables
 *   3. Calls Ollama to generate the building model JSON
 *   4. Validates the LLM output (Zod)
 *   5. Forwards validated model to the ETABS Python service
 *   6. Returns analysis results to the frontend
 */
import { Router } from "express";
import type { Request, Response } from "express";
import { AnalysisRequestSchema } from "../schemas/buildingModel.js";
import { buildGeometryPrompt } from "../prompts/geometryPrompt.js";
import { generateBuildingModel } from "../services/ollamaService.js";
import { runEtabsAnalysis, checkEtabsHealth } from "../services/etabsBridge.js";

export const analysisRouter = Router();

/**
 * POST /api/analyze — Full analysis pipeline
 */
analysisRouter.post("/analyze", async (req: Request, res: Response) => {
  // ── Step 1: Validate frontend input ──────────────────────
  const input = AnalysisRequestSchema.safeParse(req.body);

  if (!input.success) {
    res.status(400).json({
      error: "Invalid input",
      details: input.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
    return;
  }

  // ── Step 2: Check ETABS service is reachable ─────────────
  const etabsOk = await checkEtabsHealth();
  if (!etabsOk) {
    res.status(503).json({
      error:
        "ETABS service is not reachable. Make sure the Python microservice " +
        "is running on the Windows host (python main.py).",
    });
    return;
  }

  try {
    // ── Step 3: Build prompt and call LLM ────────────────────
    console.log("── Starting analysis pipeline ──");
    const { system, user } = buildGeometryPrompt(input.data);
    const buildingModel = await generateBuildingModel(system, user);

    // ── Step 4: Send to ETABS for analysis ───────────────────
    const results = await runEtabsAnalysis(buildingModel);

    // ── Step 5: Return results ───────────────────────────────
    res.json({
      success: true,
      buildingModel,  // Include the generated model so the frontend can display it
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Analysis pipeline failed:", message);
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/analyze/health — Check all downstream services
 */
analysisRouter.get("/analyze/health", async (_req: Request, res: Response) => {
  const etabsOk = await checkEtabsHealth();
  res.json({
    backend: true,
    etabsService: etabsOk,
    ollamaUrl: process.env.OLLAMA_URL || "http://localhost:11434",
    ollamaModel: process.env.OLLAMA_MODEL || "llama3.1:8b",
  });
});
