import { Button } from "../../components/Button/Button.tsx";
import { EmptyState } from "../../components/EmptyState/EmptyState.tsx";

/** The index itself didn't load (or its schema version changed). */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <EmptyState
      alert
      title="Couldn’t load schedules."
      text={message}
      actions={
        <Button variant="primary" onClick={onRetry}>
          Retry
        </Button>
      }
    />
  );
}
