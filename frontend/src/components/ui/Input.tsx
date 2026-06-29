import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function Input({ className = "", label, id, ...props }: InputProps) {
  const inputId = id ?? props.name;

  return (
    <label className="block">
      {label ? (
        <span className="mb-1.5 block text-xs font-medium text-neutral-600">
          {label}
        </span>
      ) : null}
      <input
        className={[
          "h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-950",
          "placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        id={inputId}
        {...props}
      />
    </label>
  );
}
