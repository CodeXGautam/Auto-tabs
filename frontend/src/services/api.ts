/**
 * frontend/src/services/api.ts — Backend API client
 *
 * Single function to call the analysis endpoint.
 * Uses the Vite proxy in dev (/api → localhost:3000).
 */
import type { AnalysisRequest, AnalysisResponse } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

/**
 * POST /api/analyze — Send the building form data, get back ETABS results.
 * Throws an Error with a user-readable message on failure.
 */
export async function runAnalysis(
  data: AnalysisRequest
): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const json = await res.json();

  if (!res.ok) {
    // Backend returns { error: string, details?: [...] }
    const msg = json.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return json as AnalysisResponse;
}
