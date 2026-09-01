"use client";

import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const fieldCls =
  "w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-xs text-destructive">
      {error}
    </p>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className, id, ...props },
  ref,
) {
  const inputId = id ?? props.name;
  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
      ) : null}
      <input ref={ref} id={inputId} aria-invalid={error ? true : undefined} className={cn(fieldCls, className)} {...props} />
      <FieldError error={error} />
    </div>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className, id, ...props },
  ref,
) {
  const inputId = id ?? props.name;
  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
      ) : null}
      <textarea ref={ref} id={inputId} aria-invalid={error ? true : undefined} className={cn(fieldCls, "min-h-24", className)} {...props} />
      <FieldError error={error} />
    </div>
  );
});

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, label, error, className, id, ...props },
  ref,
) {
  const inputId = id ?? props.name;
  return (
    <div className="space-y-1.5">
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select ref={ref} id={inputId} aria-invalid={error ? true : undefined} className={cn(fieldCls, "appearance-none pr-9", className)} {...props}>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      <FieldError error={error} />
    </div>
  );
});
