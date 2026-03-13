/**
 * frontend/src/components/BuildingForm.tsx — Main input form
 *
 * Polished, section-grouped form with icons, better spacing, and
 * a professional engineering-tool appearance.
 */
import { useState } from "react";
import type { AnalysisRequest } from "../types";
import { IS_CODES } from "../types";

interface Props {
  onSubmit: (data: AnalysisRequest, pdfFile?: File) => void;
  loading: boolean;
}

const DEFAULTS: AnalysisRequest = {
  description: "",
  numStoreys: 4,
  numBaysX: 3,
  numBaysY: 2,
  bayWidthX: 5,
  bayWidthY: 4,
  storeyHeight: 3.2,
  concreteGrade: "M25",
  steelGrade: "Fe500",
  seismicZone: "III",
  soilType: "II",
  isCodes: ["IS 456:2000", "IS 1893 Part 1", "IS 875 Part 1", "IS 875 Part 2"],
};

export default function BuildingForm({ onSubmit, loading }: Props) {
  const [form, setForm] = useState<AnalysisRequest>(DEFAULTS);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  }

  function toggleCode(code: string) {
    setForm((prev) => ({
      ...prev,
      isCodes: prev.isCodes.includes(code)
        ? prev.isCodes.filter((c) => c !== code)
        : [...prev.isCodes, code],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form, pdfFile ?? undefined);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      {/* ── 0. PDF Upload (Optional) ───────────────────── */}
      <Section
        number={0}
        title="Upload PDF (Optional)"
        subtitle="Upload a structural requirements document"
      >
        <PdfDropZone
          file={pdfFile}
          onFileSelect={setPdfFile}
          onRemove={() => setPdfFile(null)}
        />
        {pdfFile && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-amber-700 font-medium">
              PDF mode active — manual fields below are optional overrides
            </span>
          </div>
        )}
      </Section>

      {/* ── 1. Building Description ──────────────────────── */}
      <Section
        number={1}
        title="Project Description"
        subtitle="Describe the building type and purpose"
      >
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder={pdfFile
            ? "Optional — add notes to supplement the PDF, or leave blank"
            : "e.g. 4-storey residential building with open ground floor parking, located in Seismic Zone III on medium soil..."
          }
          rows={3}
          required={!pdfFile}
          minLength={pdfFile ? 0 : 10}
          className="input-field resize-none"
        />
      </Section>

      {/* ── 2. Grid / Geometry ───────────────────────────── */}
      <Section
        number={2}
        title="Grid & Geometry"
        subtitle="Define the structural grid layout"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-5">
          <InputField label="No. of Storeys" name="numStoreys" value={form.numStoreys} onChange={handleChange} min={1} max={60} />
          <InputField label="Storey Height" name="storeyHeight" value={form.storeyHeight} onChange={handleChange} step={0.1} min={2} unit="m" />
          <InputField label="Bays in X" name="numBaysX" value={form.numBaysX} onChange={handleChange} min={1} />
          <InputField label="Bays in Y" name="numBaysY" value={form.numBaysY} onChange={handleChange} min={1} />
          <InputField label="Bay Width X" name="bayWidthX" value={form.bayWidthX} onChange={handleChange} step={0.5} min={1} unit="m" />
          <InputField label="Bay Width Y" name="bayWidthY" value={form.bayWidthY} onChange={handleChange} step={0.5} min={1} unit="m" />
        </div>
      </Section>

      {/* ── 3. Materials ─────────────────────────────────── */}
      <Section
        number={3}
        title="Materials"
        subtitle="Per IS 456:2000 and IS 1786"
      >
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Concrete Grade"
            name="concreteGrade"
            value={form.concreteGrade}
            onChange={handleChange}
            options={["M15", "M20", "M25", "M30", "M35", "M40"]}
          />
          <SelectField
            label="Steel Grade"
            name="steelGrade"
            value={form.steelGrade}
            onChange={handleChange}
            options={["Fe415", "Fe500", "Fe550"]}
          />
        </div>
      </Section>

      {/* ── 4. Seismic Parameters ────────────────────────── */}
      <Section
        number={4}
        title="Seismic Parameters"
        subtitle="Per IS 1893 (Part 1):2016"
      >
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Seismic Zone"
            name="seismicZone"
            value={form.seismicZone}
            onChange={handleChange}
            options={["II", "III", "IV", "V"]}
          />
          <SelectField
            label="Soil Type"
            name="soilType"
            value={form.soilType}
            onChange={handleChange}
            options={["I", "II", "III"]}
          />
        </div>
      </Section>

      {/* ── 5. IS Code Checklist ─────────────────────────── */}
      <Section
        number={5}
        title="Applicable IS Codes"
        subtitle="Select the Indian Standards to apply"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {IS_CODES.map((code) => {
            const checked = form.isCodes.includes(code.value);
            return (
              <label
                key={code.value}
                className={`
                  flex items-center gap-3 px-3.5 py-2.5 rounded-lg border cursor-pointer transition-all text-sm
                  ${checked
                    ? "border-brand-300 bg-brand-50/60 text-brand-800"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }
                `}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCode(code.value)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <span className={checked ? "font-medium" : ""}>{code.label}</span>
              </label>
            );
          })}
        </div>
      </Section>

      {/* ── Submit ────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={loading}
        className={`
          w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide
          transition-all duration-200 shadow-sm
          ${loading
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-gradient-to-r from-brand-600 to-brand-500 text-white hover:from-brand-700 hover:to-brand-600 hover:shadow-md active:scale-[0.99]"
          }
        `}
      >
        {loading ? "Analysis in progress..." : "Run ETABS Analysis"}
      </button>
    </form>
  );
}

// ── Sub-components ──────────────────────────────────────────

/** Numbered section wrapper with title + subtitle */
function Section({
  number,
  title,
  subtitle,
  children,
}: {
  number: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex items-center justify-center h-7 w-7 rounded-full bg-brand-600 text-white text-xs font-bold flex-shrink-0">
          {number}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-gray-800 leading-none">{title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/** Styled number input with optional unit badge */
function InputField({
  label,
  name,
  value,
  onChange,
  unit,
  ...rest
}: {
  label: string;
  name: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  unit?: string;
  [key: string]: unknown;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          name={name}
          value={value}
          onChange={onChange}
          className="input-field pr-10"
          {...rest}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium pointer-events-none">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

/** Styled select dropdown */
function SelectField({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">
        {label}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="input-field appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20011.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.5rem_center] bg-no-repeat pr-8"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

/** PDF drag-and-drop / file picker zone */
function PdfDropZone({
  file,
  onFileSelect,
  onRemove,
}: {
  file: File | null;
  onFileSelect: (f: File) => void;
  onRemove: () => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type === "application/pdf") {
      onFileSelect(droppedFile);
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) onFileSelect(selected);
    e.target.value = "";
  }

  if (file) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-brand-200 bg-brand-50/50">
        <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
          <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
          <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 transition-colors p-1"
          title="Remove PDF"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer
        ${isDragOver
          ? "border-brand-400 bg-brand-50/50"
          : "border-gray-300 hover:border-gray-400 hover:bg-gray-50/50"
        }
      `}
    >
      <input
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div className="flex flex-col items-center gap-2">
        <svg className={`h-8 w-8 ${isDragOver ? "text-brand-400" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <p className="text-sm text-gray-600">
          <span className="font-medium text-brand-600">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-400">PDF only, max 10 MB</p>
      </div>
    </div>
  );
}
