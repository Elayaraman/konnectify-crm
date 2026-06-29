import { Button } from "@/components/ui/Button";

type ErrorStateProps = {
  message: string;
  onRetry: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-5">
      <h3 className="text-sm font-semibold text-red-800">
        Something went wrong
      </h3>
      <p className="mt-2 text-sm leading-6 text-red-700">{message}</p>
      <Button className="mt-4" onClick={onRetry} size="sm" variant="danger">
        Retry
      </Button>
    </div>
  );
}
