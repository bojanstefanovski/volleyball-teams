"use client";

type WeightFieldProps = {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

export function WeightField({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  step = 0.5,
}: WeightFieldProps) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-gray-600 dark:text-neutral-300">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(Math.max(min, Math.min(max, n)));
        }}
        className="w-24 text-center rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </label>
  );
}