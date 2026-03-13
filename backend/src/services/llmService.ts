/**
 * backend/src/services/llmService.ts — OpenRouter LLM client
 *
 * Uses OpenRouter's OpenAI-compatible API.
 *
 * DEFAULT (free, vision + PDF support):
 *   meta-llama/llama-4-maverick:free
 *
 * Other free options:
 *   meta-llama/llama-3.3-70b-instruct:free  (text only, no PDF)
 *   mistralai/mistral-small-3.1-24b-instruct:free
 *
 * Set LLM_MODEL in .env to override.
 */
import OpenAI from "openai";
import { BuildingModelSchema, type BuildingModel } from "../schemas/buildingModel.js";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const LLM_MODEL = process.env.LLM_MODEL || "meta-llama/llama-4-maverick:free";

if (!OPENROUTER_API_KEY) {
  console.warn("⚠ OPENROUTER_API_KEY is not set — analysis calls will fail");
}

const client = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: OPENROUTER_API_KEY ?? "",
  defaultHeaders: {
    "HTTP-Referer": "https://github.com/etabs-llm-automation",
    "X-Title": "ETABS LLM Automation",
  },
});

type FilePart = { type: "file"; file: { filename: string; file_data: string } };
type TextPart = { type: "text"; text: string };

async function callLLM(system: string, user: string, pdfBuffer?: Buffer): Promise<string> {
  console.log(`→ Calling LLM (${LLM_MODEL})${pdfBuffer ? " with PDF" : ""}`);

  // If a PDF is attached, send content as an array with file + text parts
  const userContent: string | (FilePart | TextPart)[] = pdfBuffer
    ? [
        {
          type: "file",
          file: {
            filename: "building-spec.pdf",
            file_data: `data:application/pdf;base64,${pdfBuffer.toString("base64")}`,
          },
        } satisfies FilePart,
        { type: "text", text: user } satisfies TextPart,
      ]
    : user;

  const response = await client.chat.completions.create({
    model: LLM_MODEL,
    // json_object mode ensures clean JSON output
    response_format: { type: "json_object" },
    temperature: 0.1,
    max_tokens: 4096,
    messages: [
      { role: "system", content: system },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { role: "user", content: userContent as any },
    ],
  });

  return response.choices[0].message.content ?? "";
}

/**
 * Call the LLM with the geometry prompt and validate the response with Zod.
 * When pdfBuffer is provided, the PDF is sent as inline base64 data.
 */
export async function generateBuildingModel(
  system: string,
  user: string,
  pdfBuffer?: Buffer
): Promise<BuildingModel> {
  const rawText = await callLLM(system, user, pdfBuffer);

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error("LLM returned invalid JSON:", rawText.slice(0, 500));
    throw new Error("LLM did not return valid JSON. Try re-running the analysis.");
  }

  const result = BuildingModelSchema.safeParse(parsed);
  if (!result.success) {
    console.error("Zod validation failed:", result.error.format());
    throw new Error(
      `LLM JSON failed validation: ${result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`
    );
  }

  console.log("✓ LLM response validated successfully");
  return result.data;
}
