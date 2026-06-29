import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  description?: string;
  action?: ReactNode;
};

export function Card({
  action,
  children,
  className = "",
  description,
  title,
  ...props
}: CardProps) {
  return (
    <section
      className={[
        "rounded-lg border border-neutral-200 bg-white shadow-sm shadow-neutral-200/40",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {title || description || action ? (
        <div className="flex items-start justify-between gap-4 border-b border-neutral-100 px-5 py-4">
          <div>
            {title ? (
              <h2 className="text-sm font-semibold text-neutral-950">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-neutral-500">{description}</p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
