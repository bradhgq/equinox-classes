import { Button } from "../../components/Button/Button.tsx";
import { Monogram } from "../../components/Monogram/Monogram.tsx";
import styles from "./Header.module.css";

interface Props {
  /** Hidden until a club is chosen (nothing to share yet). */
  canShare: boolean;
  onShare: (anchor: HTMLElement) => void;
  isDesktop: boolean;
}

export function Header({ canShare, onShare, isDesktop }: Props) {
  return (
    <header class={styles.header}>
      <h1 class={styles.brand}>
        <Monogram size={isDesktop ? 30 : 26} />
        <span class={styles.wordmark}>Equinox Classes</span>
        <span class={styles.tag}>Unofficial</span>
      </h1>
      {canShare && (
        <Button
          class={styles.share}
          variant={isDesktop ? "secondary" : "icon"}
          size={isDesktop ? "sm" : "md"}
          icon="share"
          label={isDesktop ? undefined : "Share this search"}
          onClick={(e) => onShare(e.currentTarget as HTMLElement)}
        >
          {isDesktop ? "Share" : undefined}
        </Button>
      )}
    </header>
  );
}
