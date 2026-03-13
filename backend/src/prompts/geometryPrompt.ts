/**
 * backend/src/prompts/geometryPrompt.ts — LLM prompt template
 *
 * This is the core prompt sent to Gemini. It embeds actual IS code
 * parameter tables so the LLM picks correct values instead of hallucinating.
 *
 * IMPORTANT: We do NOT rely on the LLM's training data for IS code values.
 * Every seismic factor, load value, and material property is provided
 * here as a reference lookup table.
 */
import type { AnalysisRequest, AnalysisRequestWithPdf } from "../schemas/buildingModel.js";

// ── Embedded IS code reference tables ────────────────────────
// These are the authoritative values — the LLM must choose from these.

const IS_CODE_TABLES = `
=== IS 1893 (Part 1):2016 — Seismic Zone Factors (Table 3) ===
Zone II  → Z = 0.10
Zone III → Z = 0.16
Zone IV  → Z = 0.24
Zone V   → Z = 0.36

=== IS 1893 — Importance Factor I (Table 8) ===
General buildings            → I = 1.0
Important buildings (schools, hospitals) → I = 1.5

=== IS 1893 — Response Reduction Factor R (Table 9, partial) ===
Ordinary RC Moment Resisting Frame (OMRF)  → R = 3.0
Special RC Moment Resisting Frame (SMRF)   → R = 5.0
Steel Ordinary Moment Resisting Frame      → R = 3.0
Steel Special Moment Resisting Frame       → R = 5.0

=== IS 1893 — Soil Types ===
Type I   → Rock or hard soil
Type II  → Medium soil
Type III → Soft soil

=== IS 875 Part 1 — Dead Loads (common values) ===
Floor finish (tiles + mortar)   → 1.0 – 1.5 kN/m²
230mm thick brick wall          → 5.0 kN/m  (line load on beams)
150mm thick brick wall          → 3.3 kN/m  (line load on beams)
Reinforced concrete unit weight → 25 kN/m³

=== IS 875 Part 2 — Imposed (Live) Loads (Table 1, partial) ===
Residential floors              → 2.0 kN/m²
Office floors                   → 3.0 kN/m²
Shops / Commercial              → 4.0 kN/m²
Classrooms                      → 3.0 kN/m²
Assembly halls (fixed seating)  → 4.0 kN/m²
Accessible roof                 → 1.5 kN/m²
Inaccessible roof               → 0.75 kN/m²

=== IS 456:2000 — Concrete Grades ===
M15 → fck = 15 MPa
M20 → fck = 20 MPa
M25 → fck = 25 MPa
M30 → fck = 30 MPa
M35 → fck = 35 MPa
M40 → fck = 40 MPa

=== IS 1786 — Steel Grades ===
Fe415  → fy = 415 MPa
Fe500  → fy = 500 MPa
Fe550  → fy = 550 MPa

=== IS 456 + IS 1893 — Load Combinations (Limit State of Strength) ===
1) 1.5 DL + 1.5 LL
2) 1.2 DL + 1.2 LL + 1.2 EQX
3) 1.2 DL + 1.2 LL - 1.2 EQX
4) 1.2 DL + 1.2 LL + 1.2 EQY
5) 1.2 DL + 1.2 LL - 1.2 EQY
6) 1.5 DL + 1.5 EQX
7) 1.5 DL - 1.5 EQX
8) 1.5 DL + 1.5 EQY
9) 1.5 DL - 1.5 EQY
10) 0.9 DL + 1.5 EQX
11) 0.9 DL - 1.5 EQX
12) 0.9 DL + 1.5 EQY
13) 0.9 DL - 1.5 EQY
`;

// ── System prompt: forces JSON output ────────────────────────

const SYSTEM_PROMPT = `You are a structural engineering assistant. You MUST respond with ONLY a valid JSON object — no markdown, no explanation, no code fences.

You will be given a building description and IS code references. Using ONLY the reference tables provided (never your training data), fill in the JSON structure.

RULES:
1. All seismic parameters must be looked up from the provided IS 1893 tables.
2. Dead and live loads must be chosen from the IS 875 tables.
3. Material strengths must match the IS 456/1786 tables exactly.
4. Provide at least the first 5 load combinations from the table.
5. bayWidthsX array length must equal numBaysX. bayWidthsY array length must equal numBaysY.
6. Section dimensions should be reasonable for the building size:
   - Columns: 0.23m–0.60m width/depth
   - Beams: 0.23m–0.45m width, 0.30m–0.75m depth
   - Slab: 0.12m–0.20m thickness
7. Output ONLY the JSON — no text before or after.`;

// ── User prompt: building-specific details ───────────────────

export function buildGeometryPrompt(req: AnalysisRequest): {
  system: string;
  user: string;
} {
  const user = `
BUILDING DESCRIPTION:
${req.description}

PARAMETERS PROVIDED BY USER:
- Number of storeys: ${req.numStoreys}
- Storey height: ${req.storeyHeight} m
- Number of bays X: ${req.numBaysX}
- Number of bays Y: ${req.numBaysY}
- Default bay width X: ${req.bayWidthX} m
- Default bay width Y: ${req.bayWidthY} m
- Concrete grade: ${req.concreteGrade}
- Steel grade: ${req.steelGrade}
- Seismic zone: ${req.seismicZone}
- Soil type: ${req.soilType}
- Applicable IS codes: ${req.isCodes.join(", ")}

REFERENCE TABLES (use ONLY these values):
${IS_CODE_TABLES}

REQUIRED OUTPUT FORMAT (JSON only, no other text):
{
  "building": {
    "numStoreys": <int>,
    "storeyHeight": <float in metres>,
    "numBaysX": <int>,
    "numBaysY": <int>,
    "bayWidthsX": [<float>, ...],
    "bayWidthsY": [<float>, ...]
  },
  "materials": {
    "concrete": { "grade": "<string>", "fck": <float> },
    "steel": { "grade": "<string>", "fy": <float> }
  },
  "sections": {
    "columns": { "width": <float>, "depth": <float> },
    "beams": { "width": <float>, "depth": <float> },
    "slabThickness": <float>
  },
  "loads": {
    "dead": { "floorFinish": <float kN/m2>, "wallLoad": <float kN/m> },
    "live": { "typical": <float kN/m2>, "roof": <float kN/m2> },
    "seismic": {
      "zone": "<II|III|IV|V>",
      "zoneFactor": <float>,
      "importanceFactor": <float>,
      "responseReductionFactor": <float>,
      "soilType": "<I|II|III>",
      "dampingRatio": 0.05
    }
  },
  "loadCombinations": [
    {
      "name": "<string>",
      "factors": { "dead": <float>, "live": <float>, "eqx": <float or omit>, "eqy": <float or omit> }
    }
  ]
}`;

  return { system: SYSTEM_PROMPT, user };
}

// ── PDF-aware prompt builder ─────────────────────────────────

const JSON_OUTPUT_TEMPLATE = `
REQUIRED OUTPUT FORMAT (JSON only, no other text):
{
  "building": {
    "numStoreys": <int>,
    "storeyHeight": <float in metres>,
    "numBaysX": <int>,
    "numBaysY": <int>,
    "bayWidthsX": [<float>, ...],
    "bayWidthsY": [<float>, ...]
  },
  "materials": {
    "concrete": { "grade": "<string>", "fck": <float> },
    "steel": { "grade": "<string>", "fy": <float> }
  },
  "sections": {
    "columns": { "width": <float>, "depth": <float> },
    "beams": { "width": <float>, "depth": <float> },
    "slabThickness": <float>
  },
  "loads": {
    "dead": { "floorFinish": <float kN/m2>, "wallLoad": <float kN/m> },
    "live": { "typical": <float kN/m2>, "roof": <float kN/m2> },
    "seismic": {
      "zone": "<II|III|IV|V>",
      "zoneFactor": <float>,
      "importanceFactor": <float>,
      "responseReductionFactor": <float>,
      "soilType": "<I|II|III>",
      "dampingRatio": 0.05
    }
  },
  "loadCombinations": [
    {
      "name": "<string>",
      "factors": { "dead": <float>, "live": <float>, "eqx": <float or omit>, "eqy": <float or omit> }
    }
  ]
}`;

/**
 * Build a prompt for PDF mode. The PDF itself is sent as inline data to Gemini
 * (not as extracted text), so this prompt only includes manual overrides
 * and instructions for Gemini to read the attached PDF.
 * Manual fields ALWAYS take precedence over PDF content.
 */
export function buildGeometryPromptWithPdf(
  req: AnalysisRequestWithPdf
): { system: string; user: string } {
  // If all manual fields are present, delegate to the standard prompt builder
  if (isCompleteManualRequest(req)) {
    return buildGeometryPrompt(req as AnalysisRequest);
  }

  // Build the "manual overrides" section — only fields the user provided
  const overrides: string[] = [];
  if (req.numStoreys !== undefined) overrides.push(`- Number of storeys: ${req.numStoreys}`);
  if (req.storeyHeight !== undefined) overrides.push(`- Storey height: ${req.storeyHeight} m`);
  if (req.numBaysX !== undefined) overrides.push(`- Bays in X: ${req.numBaysX}`);
  if (req.numBaysY !== undefined) overrides.push(`- Bays in Y: ${req.numBaysY}`);
  if (req.bayWidthX !== undefined) overrides.push(`- Bay width X: ${req.bayWidthX} m`);
  if (req.bayWidthY !== undefined) overrides.push(`- Bay width Y: ${req.bayWidthY} m`);
  if (req.concreteGrade) overrides.push(`- Concrete grade: ${req.concreteGrade}`);
  if (req.steelGrade) overrides.push(`- Steel grade: ${req.steelGrade}`);
  if (req.seismicZone) overrides.push(`- Seismic zone: ${req.seismicZone}`);
  if (req.soilType) overrides.push(`- Soil type: ${req.soilType}`);
  if (req.isCodes?.length) overrides.push(`- Applicable IS codes: ${req.isCodes.join(", ")}`);

  const sections: string[] = [];

  sections.push(
    `DOCUMENT CONTEXT: A PDF document is attached. Extract all relevant structural engineering ` +
    `parameters (building dimensions, material specifications, loads, etc.) from it.`
  );
  if (req.description) {
    sections.push(`BUILDING DESCRIPTION:\n${req.description}`);
  }
  if (overrides.length > 0) {
    sections.push(
      `MANUAL PARAMETERS (these take PRECEDENCE over any values in the document):\n${overrides.join("\n")}`
    );
  }

  sections.push(`REFERENCE TABLES (use ONLY these values):\n${IS_CODE_TABLES}`);
  sections.push(
    `IMPORTANT: If the document and manual parameters conflict, ALWAYS use the manual parameter values.`
  );
  sections.push(JSON_OUTPUT_TEMPLATE);

  const user = sections.join("\n\n");
  return { system: SYSTEM_PROMPT, user };
}

function isCompleteManualRequest(req: AnalysisRequestWithPdf): boolean {
  return Boolean(
    req.description &&
    req.numStoreys &&
    req.numBaysX &&
    req.numBaysY &&
    req.bayWidthX &&
    req.bayWidthY &&
    req.storeyHeight &&
    req.concreteGrade &&
    req.steelGrade &&
    req.seismicZone &&
    req.soilType &&
    req.isCodes?.length
  );
}
