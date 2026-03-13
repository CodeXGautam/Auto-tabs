/**
 * frontend/src/types/index.ts — Shared TypeScript types
 *
 * These mirror the Zod schemas on the backend.
 * We define them separately here to avoid importing Zod in the frontend.
 */

/** What the form sends to POST /api/analyze */
export interface AnalysisRequest {
  description: string;
  numStoreys: number;
  numBaysX: number;
  numBaysY: number;
  bayWidthX: number;
  bayWidthY: number;
  storeyHeight: number;
  concreteGrade: string;
  steelGrade: string;
  seismicZone: "II" | "III" | "IV" | "V";
  soilType: "I" | "II" | "III";
  isCodes: string[];
}

/** Storey drift result for a single floor */
export interface StoryDrift {
  story: string;
  driftX: number;
  driftY: number;
}

/** Analysis results returned from ETABS */
export interface AnalysisResult {
  storyDrifts: StoryDrift[];
  baseShear: { x: number; y: number };
  maxBendingMoment: number;
  maxReaction: number;
  edbFilePath: string;
}

/** Full response from POST /api/analyze */
export interface AnalysisResponse {
  success: boolean;
  buildingModel: unknown; // The LLM-generated model (for debugging display)
  results: AnalysisResult;
}

/** Error response from backend */
export interface ApiError {
  error: string;
  details?: { field: string; message: string }[];
}

/** Available IS codes with descriptive labels */
export const IS_CODES = [
  { value: "IS 456:2000", label: "IS 456:2000 — Plain & Reinforced Concrete" },
  { value: "IS 1893 Part 1", label: "IS 1893 Part 1 — Seismic (General)" },
  { value: "IS 1893 Part 2", label: "IS 1893 Part 2 — Seismic (Liquid Tanks)" },
  { value: "IS 1893 Part 3", label: "IS 1893 Part 3 — Seismic (Bridges)" },
  { value: "IS 1893 Part 4", label: "IS 1893 Part 4 — Seismic (Industrial)" },
  { value: "IS 1893 Part 5", label: "IS 1893 Part 5 — Seismic (Dams)" },
  { value: "IS 875 Part 1", label: "IS 875 Part 1 — Dead Loads" },
  { value: "IS 875 Part 2", label: "IS 875 Part 2 — Imposed Loads" },
  { value: "IS 875 Part 3", label: "IS 875 Part 3 — Wind Loads" },
  { value: "IS 800:2007", label: "IS 800:2007 — Steel Design" },
] as const;
