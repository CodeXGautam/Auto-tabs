/**
 * frontend/src/services/api.ts — Backend API client
 *
 * Supports two modes:
 * - JSON (manual-only): existing behavior
 * - multipart/form-data (PDF + optional manual fields)
 */
import type { AnalysisRequest, AnalysisResponse } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

/**
 * POST /api/analyze — Send building data, get back ETABS results.
 * When pdfFile is provided, sends multipart/form-data instead of JSON.
 */
export async function runAnalysis(
  data: AnalysisRequest,
  pdfFile?: File
): Promise<AnalysisResponse> {
  let res: Response;

  if (pdfFile) {
    const formData = new FormData();
    formData.append("pdfFile", pdfFile);

    // Append manual fields that have values
    if (data.description) formData.append("description", data.description);
    if (data.numStoreys) formData.append("numStoreys", String(data.numStoreys));
    if (data.numBaysX) formData.append("numBaysX", String(data.numBaysX));
    if (data.numBaysY) formData.append("numBaysY", String(data.numBaysY));
    if (data.bayWidthX) formData.append("bayWidthX", String(data.bayWidthX));
    if (data.bayWidthY) formData.append("bayWidthY", String(data.bayWidthY));
    if (data.storeyHeight) formData.append("storeyHeight", String(data.storeyHeight));
    if (data.concreteGrade) formData.append("concreteGrade", data.concreteGrade);
    if (data.steelGrade) formData.append("steelGrade", data.steelGrade);
    if (data.seismicZone) formData.append("seismicZone", data.seismicZone);
    if (data.soilType) formData.append("soilType", data.soilType);
    if (data.isCodes?.length) formData.append("isCodes", JSON.stringify(data.isCodes));

    // Do NOT set Content-Type — browser sets it with boundary automatically
    res = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      body: formData,
    });
  } else {
    res = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  const json = await res.json();

  if (!res.ok) {
    const msg = json.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return json as AnalysisResponse;
}
