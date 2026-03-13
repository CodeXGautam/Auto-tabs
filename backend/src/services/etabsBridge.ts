/**
 * backend/src/services/etabsBridge.ts — ETABS Python microservice client
 *
 * Sends the validated BuildingModel JSON to the Python Flask service
 * running on the Windows host. The Python service does the actual
 * ETABS COM automation via win32com.
 *
 * This file is intentionally thin — it's just an HTTP client.
 * All ETABS logic lives in the Python service.
 */
import type { BuildingModel } from "../schemas/buildingModel.js";
import { AnalysisResultSchema, type AnalysisResult } from "../schemas/buildingModel.js";

const ETABS_SERVICE_URL =
  process.env.ETABS_SERVICE_URL || "http://localhost:5000";

/**
 * Check if the ETABS Python service is reachable.
 */
export async function checkEtabsHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${ETABS_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Send a validated building model to the ETABS service for analysis.
 *
 * The Python service will:
 * 1. Launch ETABS (if not already open)
 * 2. Create grid, stories, sections, materials
 * 3. Assign loads and load combinations
 * 4. Run analysis
 * 5. Extract results (drift, base shear, moments, reactions)
 * 6. Save the .edb file
 * 7. Return results JSON
 */
export async function runEtabsAnalysis(
  model: BuildingModel
): Promise<AnalysisResult> {
  console.log(`→ Sending model to ETABS service at ${ETABS_SERVICE_URL}`);

  const response = await fetch(`${ETABS_SERVICE_URL}/etabs/build-model`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(model),
    // ETABS analysis can take a while — 5 minute timeout
    signal: AbortSignal.timeout(300_000),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ETABS service returned ${response.status}: ${errText}`);
  }

  const data = await response.json();

  // Validate the response from Python too (defence in depth)
  const result = AnalysisResultSchema.safeParse(data);
  if (!result.success) {
    console.error("ETABS response validation failed:", result.error.format());
    throw new Error("ETABS service returned an unexpected response format.");
  }

  console.log("✓ ETABS analysis complete");
  return result.data;
}
