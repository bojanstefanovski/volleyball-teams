"use client";

type StepperInputProps = {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
};

export function StepperInput({
  label,
  value,
  onChange,
  min = 1,
  max = 99,
}: StepperInputProps) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  const onManual = (v: number) => {
    if (Number.isNaN(v)) return;
    onChange(Math.max(min, Math.min(max, Math.floor(v))));
  };

  return (
    <div className="flex items-center justify-between gap-2 text-sm text-gray-700 dark:text-neutral-200">
      <span className="text-gray-600 dark:text-neutral-300">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={dec}
          aria-label={`Diminuer ${label}`}
          className="h-8 w-8 rounded-md border border-gray-300 dark:border-neutral-700 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 active:opacity-90 disabled:opacity-50 cursor-pointer text-gray-900 dark:text-neutral-100"
          disabled={value <= min}
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          className="w-20 text-center rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onManual(Number(e.target.value))}
        />
        <button
          type="button"
          onClick={inc}
          aria-label={`Augmenter ${label}`}
          className="h-8 w-8 rounded-md border border-gray-300 dark:border-neutral-700 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 active:opacity-90 disabled:opacity-50 cursor-pointer text-gray-900 dark:text-neutral-100"
          disabled={value >= max}
        >
          +
        </button>
      </div>
    </div>
  );
}