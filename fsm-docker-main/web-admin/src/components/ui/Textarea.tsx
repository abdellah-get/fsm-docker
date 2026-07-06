// src/components/ui/Textarea.tsx

"use client";

import { forwardRef, TextareaHTMLAttributes, ReactNode } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
  required?: boolean;
  helper?: string;
  className?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      icon,
      error,
      required,
      helper,
      className = "",
      disabled,
      rows = 4,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "w-full px-4 py-2 border rounded-lg text-sm transition-all duration-200 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-dark-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none";

    const iconStyles = icon ? "pl-9" : "";
    const errorStyles = error
      ? "border-red-500 dark:border-red-500 focus:ring-red-500 dark:focus:ring-red-400"
      : "";

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={props.id}
            className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-400 mb-1.5"
          >
            {label}
            {required && (
              <span className="text-red-500 dark:text-red-400 ml-1">*</span>
            )}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-3 text-gray-400 dark:text-gray-500 pointer-events-none">
              {icon}
            </div>
          )}

          <textarea
            ref={ref}
            rows={rows}
            className={`${baseStyles} ${iconStyles} ${errorStyles} ${className}`}
            disabled={disabled}
            {...props}
          />
        </div>

        {error && (
          <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>
        )}
        {helper && !error && (
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {helper}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

export default Textarea;
