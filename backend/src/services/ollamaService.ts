/**
 * backend/src/services/ollamaService.ts — Ollama HTTP client
 *
 * Sends prompts to the locally running Ollama instance and parses
 * the JSON response. Uses the native fetch API (Node 18+).
 *
 * Ollama REST API docs: https://github.com/ollama/ollama/blob/main/docs/api.md
 */
import { BuildingModelSchema, type BuildingModel } from "../schemas/buildingModel.js";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";

/**
 * Call Ollama's /api/generate endpoint with a system + user prompt.
 * Returns the raw text response from the model.
 */
async function callOllama(system: string, user: string): Promise<string> {
  const url = `${OLLAMA_URL}/api/generate`;

  const body = {
    model: OLLAMA_MODEL,
    system,
    prompt: user,
    stream: false,          // Get the full response at once (simpler to handle)
    options: {
      temperature: 0.1,     // Low temperature = more deterministic JSON output
      num_predict: 4096,    // Allow enough tokens for the full JSON
    },
    // Force JSON output format if model supports it
    format: "json",
  };

  console.log(`→ Calling Ollama (${OLLAMA_MODEL}) at ${url}`);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ollama returned ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as { response: string };
  return data.response;
}

/**
 * Send the geometry prompt to Ollama and validate the response with Zod.
 *
 * Flow: prompt → Ollama → raw text → JSON.parse → Zod validate → BuildingModel
 *
 * Throws a descriptive error if Ollama returns invalid JSON or if the
 * structure doesn't match the schema.
 */
export async function generateBuildingModel(
  system: string,
  user: string
): Promise<BuildingModel> {
  const rawText = await callOllama(system, user);

  // Step 1: Parse the raw text as JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error("LLM returned invalid JSON:", rawText.slice(0, 500));
    throw new Error(
      "LLM did not return valid JSON. This can happen with smaller models. " +
      "Try re-running or use a larger model."
    );
  }

  // Step 2: Validate against our Zod schema
  const result = BuildingModelSchema.safeParse(parsed);
  if (!result.success) {
    console.error("Zod validation failed:", result.error.format());
    throw new Error(
      `LLM JSON failed validation: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`
    );
  }

  console.log("✓ LLM response validated successfully");
  return result.data;
}
