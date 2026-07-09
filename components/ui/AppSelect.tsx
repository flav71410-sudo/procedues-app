"use client";

import { SelectHTMLAttributes } from "react";

type Option = {
  value: string;
  label: string;
};

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  options: Option[];
};

export default function AppSelect({
  label,
  error,
  options,
  className = "",
  ...props
}: Props) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300">
          {label}
        </label>
      )}

      <select
        {...props}
        className={`
          w-full rounded-xl border border-gray-300 dark:border-slate-700
          bg-white dark:bg-slate-900
          px-4 py-3
          text-gray-900 dark:text-white
          outline-none transition
          focus:border-[#0078B8]
          focus:ring-2 focus:ring-[#0078B8]/20
          disabled:bg-gray-100 dark:disabled:bg-slate-800
          disabled:cursor-not-allowed
          ${className}
        `}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}