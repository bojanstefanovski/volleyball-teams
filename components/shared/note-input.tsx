"use client";

import type React from "react";
import { useEffect, useState } from "react";

type NoteInputProps = {
  label: string;
  value: number; // 1..10
  onChange: (v: number) => void;
};

export function NoteInput({ label, value, onChange }: NoteInputProps) {
  const [buf, setBuf] = useState<string>(String(value));
  useEffect(() => setBuf(String(value)), [value]);

  const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n)));

  const commit = () => {
    const n = Number(buf);
    if (Number.isFinite(n)) {
      onChange(clamp(n));
    } else {
      setBuf(String(value));
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" || e.key === "Tab") commit();
    if (e.key === "Escape") setBuf(String(value));
  };

  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-gray-600 dark:text-neutral-300">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={buf}
        onChange={(e) => {
          const digitsOnly = e.target.value.replace(/[^\d]/g, "");
          setBuf(digitsOnly);
        }}
        onBlur={commit}
        onKeyDown={onKeyDown}
        onFocus={(e) => e.currentTarget.select()}
        className="w-20 text-center rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label={`${label} (1 à 10)`}
      />
    </label>
  );
}