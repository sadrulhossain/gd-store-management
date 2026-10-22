import { TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

/** Shown in place of content whose request failed. */
export function ErrorState({
  title = "Could not load this data",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <EmptyState
      icon={TriangleAlertIcon}
      title={title}
      description={message}
      action={
        onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        )
      }
    />
  );
}
