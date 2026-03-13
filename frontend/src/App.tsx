/**
 * frontend/src/App.tsx — Root component
 *
 * Full-page layout with a branded header, step indicators,
 * and side-by-side form + results panels.
 */
import { useState } from "react";
import BuildingForm from "./components/BuildingForm";
import ResultsDashboard from "./components/ResultsDashboard";
import { runAnalysis } from "./services/api";
import type { AnalysisRequest, AnalysisResponse } from "./types";

type PipelineStep = "idle" | "validating" | "llm" | "etabs" | "done" | "error";

const STEP_LABELS: Record<PipelineStep, string> = {
  idle: "Ready",
  validating: "Validating input...",
  llm: "Generating building model via LLM...",
  etabs: "Running ETABS analysis...",
  done: "Analysis complete",
  error: "Pipeline failed",
};

export default function App() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<PipelineStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AnalysisResponse | null>(null);

  async function handleSubmit(data: AnalysisRequest, pdfFile?: File) {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      setStep("validating");
      // Small delay so user sees the validation step
      await new Promise((r) => setTimeout(r, 300));
      setStep("llm");
      const response = await runAnalysis(data, pdfFile);
      setStep("done");
      setResults(response);
    } catch (err) {
      setStep("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/80 flex flex-col">
      {/* ── Header ────────────────────────────────────────── */}
      <header className="bg-gradient-to-r from-brand-800 to-brand-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              ETABS Automation
            </h1>
            <p className="text-brand-200 text-sm mt-0.5">
              Structural analysis powered by Llama LLM + ETABS COM API
            </p>
          </div>
          {/* Status pill */}
          <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs font-medium">
            <span
              className={`h-2 w-2 rounded-full ${
                step === "error"
                  ? "bg-red-400"
                  : step === "done"
                  ? "bg-emerald-400"
                  : loading
                  ? "bg-amber-400 animate-pulse"
                  : "bg-emerald-400"
              }`}
            />
            {STEP_LABELS[step]}
          </div>
        </div>
      </header>

      {/* ── Pipeline progress bar ─────────────────────────── */}
      {loading && (
        <div className="h-1 bg-brand-100">
          <div className="h-full bg-brand-500 animate-pulse transition-all duration-700"
            style={{
              width:
                step === "validating" ? "15%" : step === "llm" ? "55%" : step === "etabs" ? "85%" : "100%",
            }}
          />
        </div>
      )}

      {/* ── Main Content ──────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Left panel: Form (takes 3 cols) */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
              <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Building Parameters
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Define your structure, materials, and applicable IS codes
                </p>
              </div>
              <div className="p-6">
                <BuildingForm onSubmit={handleSubmit} loading={loading} />
              </div>
            </div>
          </div>

          {/* Right panel: Results (takes 2 cols) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden sticky top-8">
              <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Analysis Results
                </h2>
              </div>

              <div className="p-6">
                {/* Loading state */}
                {loading && (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative">
                      <div className="h-14 w-14 rounded-full border-4 border-brand-100" />
                      <div className="absolute inset-0 h-14 w-14 rounded-full border-4 border-transparent border-t-brand-500 animate-spin" />
                    </div>
                    <p className="mt-5 text-sm font-medium text-gray-700">
                      {STEP_LABELS[step]}
                    </p>
                    <p className="text-xs text-gray-400 mt-1 max-w-[220px] text-center">
                      {step === "llm"
                        ? "Llama is generating the building model JSON..."
                        : step === "etabs"
                        ? "ETABS is building and analysing the model..."
                        : "Preparing..."}
                    </p>
                  </div>
                )}

                {/* Error state */}
                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-200/80 p-5">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-5 w-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-red-600 text-xs font-bold">!</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-red-800">
                          Analysis Failed
                        </p>
                        <p className="text-sm text-red-600 mt-1 leading-relaxed">
                          {error}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Results */}
                {results && <ResultsDashboard data={results} />}

                {/* Empty state */}
                {!loading && !error && !results && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
                      <svg className="h-8 w-8 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                      No results yet
                    </p>
                    <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                      Fill in the form and run the analysis to see structural results here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="border-t border-gray-200/60 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between text-xs text-gray-400">
          <span>ETABS LLM Automation &middot; IS Code Compliant Structural Analysis</span>
          <span className="font-mono">OpenRouter + ETABS 21 COM API</span>
        </div>
      </footer>
    </div>
  );
}
