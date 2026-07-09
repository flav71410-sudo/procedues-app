"use client";

import { TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};

export default function AppTextarea({
  label,
  error,
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

      <textarea
        {...props}
        className={`
          w-full
          min-h-[120px]
          resize-y
          rounded-xl
          border
          border-gray-300
          dark:border-slate-700
          bg-white
          dark:bg-slate-900
          px-4
          py-3
          text-gray-900
          dark:text-white
          placeholder:text-gray-400
          dark:placeholder:text-slate-500
          outline-none
          transition
          focus:border-[#0078B8]
          focus:ring-2
          focus:ring-[#0078B8]/20
          disabled:bg-gray-100
          dark:disabled:bg-slate-800
          disabled:cursor-not-allowed
          ${className}
        `}
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}