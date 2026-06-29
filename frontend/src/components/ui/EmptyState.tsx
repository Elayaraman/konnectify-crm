type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ description, title }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-200 bg-white px-6 py-12 text-center">
      <h3 className="text-sm font-semibold text-neutral-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">
        {description}
      </p>
    </div>
  );
}
