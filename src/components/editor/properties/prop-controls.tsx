// ============================================
// Property Controls - Reusable form primitives
// for the right-panel properties inspector
// ============================================

"use client";

import { useCallback, useState, useEffect } from "react";

// ── PropRow wrapper ──────────────────────────

interface PropRowProps {
  label: string;
  children: React.ReactNode;
  hint?: string;
}

export function PropRow({ label, children, hint }: PropRowProps) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span
        className="text-[11px] text-gray-400 shrink-0 w-24 text-right"
        title={hint}
      >
        {label}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ── PropSection wrapper ──────────────────────

interface PropSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function PropSection({ title, children, defaultOpen = true }: PropSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-800 last:border-b-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-200 transition-colors"
      >
        {title}
        <span className="text-gray-600 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="px-3 pb-3 space-y-0.5">{children}</div>}
    </div>
  );
}

// ── PropText ─────────────────────────────────

interface PropTextProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  multiline?: boolean;
  disabled?: boolean;
}

export function PropText({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  disabled,
}: PropTextProps) {
  const [local, setLocal] = useState(value);

  // Sync if external value changes
  useEffect(() => setLocal(value), [value]);

  const handleBlur = useCallback(() => {
    if (local !== value) onChange(local);
  }, [local, value, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!multiline && e.key === "Enter") {
        e.preventDefault();
        (e.target as HTMLElement).blur();
      }
    },
    [multiline]
  );

  const cls =
    "w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[11px] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <PropRow label={label}>
      {multiline ? (
        <textarea
          className={`${cls} resize-none h-16`}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
        />
      ) : (
        <input
          type="text"
          className={cls}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
        />
      )}
    </PropRow>
  );
}

// ── PropNumber ────────────────────────────────

interface PropNumberProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
}

export function PropNumber({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  disabled,
}: PropNumberProps) {
  const [local, setLocal] = useState(String(value));

  useEffect(() => setLocal(String(value)), [value]);

  const commit = useCallback(() => {
    let n = parseFloat(local);
    if (isNaN(n)) n = value;
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    setLocal(String(n));
    if (n !== value) onChange(n);
  }, [local, value, min, max, onChange]);

  return (
    <PropRow label={label}>
      <div className="flex items-center gap-1">
        <input
          type="number"
          className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[11px] text-gray-200 focus:outline-none focus:border-blue-500 disabled:opacity-50 min-w-0"
          value={local}
          min={min}
          max={max}
          step={step}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLElement).blur()}
          disabled={disabled}
        />
        {unit && <span className="text-[10px] text-gray-500 shrink-0">{unit}</span>}
      </div>
    </PropRow>
  );
}

// ── PropSlider ────────────────────────────────

interface PropSliderProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
}

export function PropSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit,
  disabled,
}: PropSliderProps) {
  return (
    <PropRow label={label}>
      <div className="flex items-center gap-2">
        <input
          type="range"
          className="flex-1 h-1 accent-blue-500 cursor-pointer disabled:opacity-50"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
        />
        <span className="text-[10px] text-gray-400 w-10 text-right shrink-0">
          {Math.round(value)}{unit}
        </span>
      </div>
    </PropRow>
  );
}

// ── PropToggle ────────────────────────────────

interface PropToggleProps {
  label: string;
  value: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}

export function PropToggle({ label, value, onChange, disabled }: PropToggleProps) {
  return (
    <PropRow label={label}>
      <button
        onClick={() => !disabled && onChange(!value)}
        className={`relative w-8 h-4 rounded-full transition-colors ${
          value ? "bg-blue-500" : "bg-gray-700"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
            value ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </PropRow>
  );
}

// ── PropSelect ────────────────────────────────

interface PropSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
  disabled?: boolean;
}

export function PropSelect({ label, value, options, onChange, disabled }: PropSelectProps) {
  return (
    <PropRow label={label}>
      <select
        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[11px] text-gray-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </PropRow>
  );
}

// ── PropColor ─────────────────────────────────

interface PropColorProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export function PropColor({ label, value, onChange, disabled }: PropColorProps) {
  return (
    <PropRow label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="w-7 h-6 rounded cursor-pointer bg-transparent border-0 p-0 disabled:opacity-50"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
        <span className="text-[10px] text-gray-400 font-mono">{value}</span>
      </div>
    </PropRow>
  );
}

// ── PropReadOnly ──────────────────────────────

interface PropReadOnlyProps {
  label: string;
  value: string;
}

export function PropReadOnly({ label, value }: PropReadOnlyProps) {
  return (
    <PropRow label={label}>
      <span className="text-[11px] text-gray-500">{value}</span>
    </PropRow>
  );
}
