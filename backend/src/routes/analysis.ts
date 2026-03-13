/**
 * backend/src/routes/analysis.ts — Main analysis API route
 *
 * POST /api/analyze
 *   Accepts JSON (manual-only) or multipart/form-data (PDF + optional manual).
 *   1. Validates the form input (Zod)
 *   2. If PDF: uploads to Cloudinary (non-critical) and passes buffer to Gemini
 *   3. Builds the LLM prompt with embedded IS code tables
 *   4. Calls Gemini 2.0 Flash to generate the building model JSON
 *      (Gemini parses the PDF natively — no separate text extraction needed)
 *   5. Validates the LLM output (Zod)
 *   6. Forwards validated model to the ETABS Python service
 *   7. Returns analysis results to the frontend
 */
import { Router } from "express";
import type { Request, Response } from "express";
import {
  AnalysisRequestSchema,
  AnalysisRequestWithPdfSchema,
} from "../schemas/buildingModel.js";
import {
  buildGeometryPrompt,
  buildGeometryPromptWithPdf,
} from "../prompts/geometryPrompt.js";
import { generateBuildingModel } from "../services/llmService.js";
import { runEtabsAnalysis, checkEtabsHealth } from "../services/etabsBridge.js";
import { uploadPdfBuffer } from "../services/cloudinaryService.js";
import { pdfUpload } from "../middleware/upload.js";

export const analysisRouter = Router();

/**
 * POST /api/analyze — Full analysis pipeline
 */
analysisRouter.post("/analyze", (req: Request, res: Response) => {
  // Use multer to parse multipart/form-data if present.
  // For application/json requests, multer is a no-op.
  pdfUpload(req, res, async (multerErr) => {
    if (multerErr) {
      const message =
        multerErr instanceof Error ? multerErr.message : "File upload failed";
      res.status(400).json({ error: message });
      return;
    }

    try {
      const hasFile = Boolean(req.file);
      const isMultipart = req.headers["content-type"]?.includes("multipart");

      // Coerce multipart string fields to proper types
      let formData = req.body;
      if (isMultipart) {
        formData = coerceMultipartFields(req.body);
      }

      // ── Pure JSON mode (no PDF — existing behavior) ──────────
      if (!hasFile) {
        const input = AnalysisRequestSchema.safeParse(formData);
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

        const etabsOk = await checkEtabsHealth();
        if (!etabsOk) {
          res.status(503).json({
            error:
              "ETABS service is not reachable. Make sure the Python microservice " +
              "is running on the Windows host (python main.py).",
          });
          return;
        }

        console.log("── Starting analysis pipeline (manual mode) ──");
        const { system, user } = buildGeometryPrompt(input.data);
        const buildingModel = await generateBuildingModel(system, user);
        const results = await runEtabsAnalysis(buildingModel);
        res.json({ success: true, buildingModel, results });
        return;
      }

      // ── PDF mode (with or without manual overrides) ──────────
      const input = AnalysisRequestWithPdfSchema.safeParse(formData);
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

      const etabsOk = await checkEtabsHealth();
      if (!etabsOk) {
        res.status(503).json({
          error:
            "ETABS service is not reachable. Make sure the Python microservice " +
            "is running on the Windows host (python main.py).",
        });
        return;
      }

      console.log("── Starting analysis pipeline (PDF mode) ──");
      const pdfBuffer = req.file!.buffer;

      // Upload to Cloudinary in the background (non-critical)
      let pdfUrl: string | undefined;
      try {
        const cloudinaryResult = await uploadPdfBuffer(pdfBuffer, req.file!.originalname);
        pdfUrl = cloudinaryResult.url;
        console.log(`PDF uploaded to Cloudinary: ${pdfUrl}`);
      } catch (err) {
        console.warn("Cloudinary upload failed (non-critical):", err);
      }

      // Build prompt — Gemini will parse the PDF directly via its multimodal API
      const { system, user } = buildGeometryPromptWithPdf(input.data);
      const buildingModel = await generateBuildingModel(system, user, pdfBuffer);
      const results = await runEtabsAnalysis(buildingModel);

      res.json({ success: true, buildingModel, results, pdfUrl });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("Analysis pipeline failed:", message);
      res.status(500).json({ error: message });
    }
  });
});

/**
 * When multipart/form-data is used, all field values arrive as strings.
 * Coerce numeric fields back to numbers and parse JSON arrays.
 */
function coerceMultipartFields(
  body: Record<string, unknown>
): Record<string, unknown> {
  const NUMERIC_FIELDS = [
    "numStoreys",
    "numBaysX",
    "numBaysY",
    "bayWidthX",
    "bayWidthY",
    "storeyHeight",
  ];

  const result: Record<string, unknown> = { ...body };

  for (const field of NUMERIC_FIELDS) {
    if (typeof result[field] === "string" && result[field] !== "") {
      result[field] = Number(result[field]);
    } else if (result[field] === "") {
      delete result[field];
    }
  }

  // isCodes arrives as a JSON string from FormData
  if (typeof result.isCodes === "string") {
    try {
      result.isCodes = JSON.parse(result.isCodes as string);
    } catch {
      // Leave as-is; Zod will catch it
    }
  }

  return result;
}

/**
 * GET /api/analyze/health — Check all downstream services
 */
analysisRouter.get("/analyze/health", async (_req: Request, res: Response) => {
  const etabsOk = await checkEtabsHealth();
  res.json({
    backend: true,
    etabsService: etabsOk,
    llm: process.env.LLM_MODEL || "meta-llama/llama-4-maverick:free",
    openRouterKeySet: Boolean(process.env.OPENROUTER_API_KEY),
  });
});
