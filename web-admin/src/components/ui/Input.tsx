// src/components/ui/Input.tsx

"use client";

import { forwardRef, InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  error?: string;
  required?: boolean;
  helper?: string;
  className?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      icon,
      iconPosition = "left",
      error,
      required,
      helper,
      className = "",
      disabled,
      ...props
    },
    ref,
  ) => {
    // Styles de base
    const baseStyles =
      "w-full px-4 py-2 border rounded-lg text-sm transition-all duration-200 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-dark-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed";

    // Styles avec icône
    const iconStyles = icon ? (iconPosition === "left" ? "pl-9" : "pr-9") : "";

    // Styles d'erreur
    const errorStyles = error
      ? "border-red-500 dark:border-red-500 focus:ring-red-500 dark:focus:ring-red-400"
      : "";

    return (
      <div className="w-full">
        {/* Label */}
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

        {/* Input avec icône */}
        <div className="relative">
          {icon && iconPosition === "left" && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            className={`${baseStyles} ${iconStyles} ${errorStyles} ${className}`}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${props.id}-error` : undefined}
            {...props}
          />

          {icon && iconPosition === "right" && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
              {icon}
            </div>
          )}
        </div>

        {/* Message d'erreur ou aide */}
        {error && (
          <p
            id={`${props.id}-error`}
            className="mt-1 text-xs text-red-500 dark:text-red-400"
          >
            {error}
          </p>
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

Input.displayName = "Input";

export default Input;
