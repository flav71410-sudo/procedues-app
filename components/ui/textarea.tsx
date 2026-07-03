"use client";

import { TextareaHTMLAttributes } from "react";

interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  required?: boolean;
}

export default function Textarea({
  label,
  error,
  required,
  className = "",
  ...props
}: TextareaProps) {
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

      <textarea
        {...props}
        className={`
          w-full
          min-h-[140px]
          rounded-xl
          border
          border-gray-300
          bg-white
          px-4
          py-3
          text-gray-900
          placeholder:text-gray-400
          outline-none
          resize-y
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