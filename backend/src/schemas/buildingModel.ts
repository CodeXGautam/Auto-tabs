/**
 * backend/src/schemas/buildingModel.ts — Zod validation schemas
 *
 * These schemas validate the structured JSON that the LLM returns.
 * Every field is explicitly typed so we catch hallucinated or malformed
 * responses before they reach the ETABS microservice.
 *
 * The shape mirrors what the Python ETABS client expects to receive.
 */
import { z } from "zod";

// ── Material definitions ─────────────────────────────────────

/** Concrete grade per IS 456:2000 (Table 2) */
export const ConcreteSchema = z.object({
  grade: z.string().describe("e.g. M20, M25, M30"),
  fck: z.number().positive().describe("Characteristic compressive strength in MPa"),
});

/** Reinforcing steel grade per IS 1786 */
export const SteelSchema = z.object({
  grade: z.string().describe("e.g. Fe415, Fe500"),
  fy: z.number().positive().describe("Yield strength in MPa"),
});

export const MaterialsSchema = z.object({
  concrete: ConcreteSchema,
  steel: SteelSchema,
});

// ── Cross-section dimensions (in metres) ─────────────────────

export const SectionsSchema = z.object({
  columns: z.object({
    width: z.number().positive().describe("Column width in metres"),
    depth: z.number().positive().describe("Column depth in metres"),
  }),
  beams: z.object({
    width: z.number().positive().describe("Beam width in metres"),
    depth: z.number().positive().describe("Beam depth in metres"),
  }),
  slabThickness: z.number().positive().describe("Slab thickness in metres"),
});

// ── Load parameters ──────────────────────────────────────────

/** Dead loads per IS 875 Part 1 */
export const DeadLoadSchema = z.object({
  floorFinish: z.number().nonnegative().describe("Floor finish load in kN/m²"),
  wallLoad: z.number().nonnegative().describe("Wall load in kN/m (line load on beams)"),
});

/** Live (imposed) loads per IS 875 Part 2 */
export const LiveLoadSchema = z.object({
  typical: z.number().nonnegative().describe("Typical floor live load in kN/m²"),
  roof: z.number().nonnegative().describe("Roof live load in kN/m²"),
});

/**
 * Seismic parameters per IS 1893 (Part 1):2016
 * All values must match the embedded reference tables in the prompt.
 */
export const SeismicLoadSchema = z.object({
  zone: z.enum(["II", "III", "IV", "V"]).describe("Seismic zone as per IS 1893"),
  zoneFactor: z.number().positive().describe("Z value — must match zone"),
  importanceFactor: z.number().positive().describe("I value (1.0 for general, 1.5 for important)"),
  responseReductionFactor: z.number().positive().describe("R value per Table 9"),
  soilType: z.enum(["I", "II", "III"]).describe("I = Rock, II = Medium, III = Soft"),
  dampingRatio: z.number().positive().default(0.05).describe("Usually 0.05 for RC"),
});

export const LoadsSchema = z.object({
  dead: DeadLoadSchema,
  live: LiveLoadSchema,
  seismic: SeismicLoadSchema,
});

// ── Load combinations per IS 456 + IS 1893 ──────────────────

export const LoadCombinationSchema = z.object({
  name: z.string().describe("Descriptive name, e.g. 1.5DL+1.5LL"),
  factors: z.object({
    dead: z.number().describe("Factor for dead load"),
    live: z.number().describe("Factor for live load"),
    eqx: z.number().optional().describe("Factor for earthquake X direction"),
    eqy: z.number().optional().describe("Factor for earthquake Y direction"),
  }),
});

// ── Top-level building model (what the LLM must return) ──────

export const BuildingModelSchema = z.object({
  building: z.object({
    numStoreys: z.number().int().min(1).max(60).describe("Number of storeys"),
    storeyHeight: z.number().positive().describe("Typical storey height in metres"),
    numBaysX: z.number().int().min(1).describe("Number of bays in X direction"),
    numBaysY: z.number().int().min(1).describe("Number of bays in Y direction"),
    bayWidthsX: z.array(z.number().positive()).describe("Array of bay widths in X (metres)"),
    bayWidthsY: z.array(z.number().positive()).describe("Array of bay widths in Y (metres)"),
  }),
  materials: MaterialsSchema,
  sections: SectionsSchema,
  loads: LoadsSchema,
  loadCombinations: z.array(LoadCombinationSchema).min(1),
});

/** TypeScript type inferred from the Zod schema — use this everywhere. */
export type BuildingModel = z.infer<typeof BuildingModelSchema>;

// ── Form input schema (what the frontend sends to backend) ───

export const AnalysisRequestSchema = z.object({
  description: z.string().min(10).describe("Free-text building description"),
  numStoreys: z.number().int().min(1).max(60),
  numBaysX: z.number().int().min(1),
  numBaysY: z.number().int().min(1),
  bayWidthX: z.number().positive().describe("Default bay width X in metres"),
  bayWidthY: z.number().positive().describe("Default bay width Y in metres"),
  storeyHeight: z.number().positive().describe("Typical storey height in metres"),
  concreteGrade: z.string(),
  steelGrade: z.string(),
  seismicZone: z.enum(["II", "III", "IV", "V"]),
  soilType: z.enum(["I", "II", "III"]),
  isCodes: z.array(z.string()).min(1).describe("Selected IS code references"),
});

export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;

// ── Analysis result schema (what comes back from ETABS) ──────

export const AnalysisResultSchema = z.object({
  storyDrifts: z.array(
    z.object({
      story: z.string(),
      driftX: z.number(),
      driftY: z.number(),
    })
  ),
  baseShear: z.object({
    x: z.number(),
    y: z.number(),
  }),
  maxBendingMoment: z.number().describe("Max beam bending moment in kN-m"),
  maxReaction: z.number().describe("Max support reaction in kN"),
  edbFilePath: z.string().describe("Path to saved .edb file"),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
