import { Button } from "../../components/Button/Button.tsx";
import styles from "./ClubLoadError.module.css";

/** One club's schedule failed to load; the rest still show (critique L4). */
export function ClubLoadError({ name, onRetry }: { name: string; onRetry: () => void }) {
  return (
    <p class={styles.row} role="alert">
      <span>{name} didn’t load</span>
      <Button variant="text" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </p>
  );
}
