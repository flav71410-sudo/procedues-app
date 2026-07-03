"use client";

import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  required?: boolean;
}

export default function Input({
  label,
  error,
  required,
  className = "",
  ...props
}: InputProps) {
  return (
    <div className="space-y-2 w-full">
      {label && (
        <label className="text-sm font-semibold text-gray-700">
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>
      )}

      <input
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
          placeholder:text-gray-400
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
      />

      {error && (
        <p className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}