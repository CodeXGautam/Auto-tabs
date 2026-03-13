/**
 * frontend/src/components/ResultsDashboard.tsx — Analysis results display
 *
 * Professional dashboard with color-coded stat cards, a well-formatted
 * drift table, and the .edb file path.
 */
import type { AnalysisResponse } from "../types";

interface Props {
  data: AnalysisResponse;
}

export default function ResultsDashboard({ data }: Props) {
  const { results } = data;

  return (
    <div className="space-y-6">

      {/* ── Summary Stat Cards ──────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Base Shear X"
          value={results.baseShear.x.toFixed(2)}
          unit="kN"
          color="blue"
        />
        <StatCard
          label="Base Shear Y"
          value={results.baseShear.y.toFixed(2)}
          unit="kN"
          color="indigo"
        />
        <StatCard
          label="Max Bending Moment"
          value={results.maxBendingMoment.toFixed(2)}
          unit="kN-m"
          color="amber"
        />
        <StatCard
          label="Max Reaction"
          value={results.maxReaction.toFixed(2)}
          unit="kN"
          color="emerald"
        />
      </div>

      {/* ── Storey Drift Table ───────────────────────────── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Storey Drifts
        </h3>
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-4 py-2.5 text-left font-semibold">Story</th>
                <th className="px-4 py-2.5 text-right font-semibold">Drift X</th>
                <th className="px-4 py-2.5 text-right font-semibold">Drift Y</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.storyDrifts.map((row, i) => (
                <tr
                  key={row.story}
                  className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
                >
                  <td className="px-4 py-2.5 font-medium text-gray-700">
                    {row.story}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-600">
                    {row.driftX.toFixed(6)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-600">
                    {row.driftY.toFixed(6)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── .edb File Path ───────────────────────────────── */}
      <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full bg-emerald-200 flex items-center justify-center">
            <svg className="h-3 w-3 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              Model saved successfully
            </p>
            <code className="text-xs text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded mt-1 inline-block font-mono">
              {results.edbFilePath}
            </code>
            <p className="text-xs text-emerald-600 mt-1.5">
              Open this file in ETABS to inspect the full model.
            </p>
          </div>
        </div>
      </div>

      {/* ── Raw LLM Model (collapsible) ──────────────────── */}
      <details className="group rounded-xl border border-gray-200 overflow-hidden">
        <summary className="px-4 py-3 cursor-pointer text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50 hover:bg-gray-50 transition-colors flex items-center justify-between">
          <span>Generated Building Model (LLM Output)</span>
          <svg className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </summary>
        <pre className="px-4 py-3 text-xs overflow-auto max-h-80 bg-gray-900 text-gray-100 font-mono leading-relaxed">
          {JSON.stringify(data.buildingModel, null, 2)}
        </pre>
      </details>
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────

const COLOR_MAP = {
  blue:    { bg: "bg-blue-50",    border: "border-blue-200/80", label: "text-blue-600",    value: "text-blue-800"    },
  indigo:  { bg: "bg-indigo-50",  border: "border-indigo-200/80", label: "text-indigo-600",  value: "text-indigo-800"  },
  amber:   { bg: "bg-amber-50",   border: "border-amber-200/80", label: "text-amber-600",   value: "text-amber-800"   },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200/80", label: "text-emerald-600", value: "text-emerald-800" },
} as const;

function StatCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: keyof typeof COLOR_MAP;
}) {
  const c = COLOR_MAP[color];
  return (
    <div className={`rounded-xl ${c.bg} border ${c.border} p-4`}>
      <p className={`text-xs font-semibold uppercase tracking-wider ${c.label}`}>
        {label}
      </p>
      <p className={`text-xl font-bold mt-1.5 ${c.value} font-mono`}>
        {value}
        <span className="text-sm font-medium ml-1 opacity-70">{unit}</span>
      </p>
    </div>
  );
}
