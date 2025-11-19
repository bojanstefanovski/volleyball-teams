"use client";

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
};

const clamp = (n: number, min = 1, max = 10) => Math.max(min, Math.min(max, Math.floor(n)));

export function NumberField({
  label,
  value,
  onChange,
  min = 1,
  max = 10,
}: NumberFieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600 dark:text-neutral-300">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value), min, max))}
        className="rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-neutral-900/70 px-3 py-2 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </label>
  );
}