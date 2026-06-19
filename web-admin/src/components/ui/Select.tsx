// src/components/ui/Select.tsx

"use client";

import { forwardRef, SelectHTMLAttributes, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  required?: boolean;
  helper?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      required,
      helper,
      options,
      placeholder,
      className = "",
      disabled,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "w-full px-4 py-2 pr-10 border rounded-lg text-sm transition-all duration-200 appearance-none bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-dark-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed";

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
          <select
            ref={ref}
            className={`${baseStyles} ${errorStyles} ${className}`}
            disabled={disabled}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
            <ChevronDown size={16} />
          </div>
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

Select.displayName = "Select";

export default Select;
