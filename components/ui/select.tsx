"use client";

import { SelectHTMLAttributes } from "react";

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  required?: boolean;
  options: Option[];
}

export default function Select({
  label,
  error,
  required,
  options,
  className = "",
  ...props
}: SelectProps) {
  return (
    <div className="space-y-2 w-full">
      {label && (
        <label className="text-sm font-semibold text-gray-700">
          {label}
          {required && (
            <span className="ml-1 text-red-600">*</span>
          )}
        </label>
      )}

      <select
        {...props}
        className={`
          w-full
          rounded-xl
          border
          border-gray-300
          bg-white
          px-4
          py-3
          text-gray-900
          outline-none
          transition
          focus:border-[#0078B8]
          focus:ring-2
          focus:ring-[#0078B8]/20
          disabled:bg-gray-100
          disabled:cursor-not-allowed
          ${error ? "border-red-500 focus:ring-red-200" : ""}
          ${className}
        `}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <p className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}