import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClassNames: Record<ButtonVariant, string> = {
  primary:
    "border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 hover:border-neutral-800",
  secondary:
    "border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50",
  ghost:
    "border-transparent bg-transparent text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950",
  danger:
    "border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100",
};

const sizeClassNames: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
};

export function Button({
  className = "",
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center rounded-md border font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClassNames[variant],
        sizeClassNames[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      type={type}
      {...props}
    />
  );
}
