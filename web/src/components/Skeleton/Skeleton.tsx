import styles from "./Skeleton.module.css";

/** Placeholder rows shown while club schedules load. */
export function SkeletonRows({ count = 6 }: { count?: number }) {
  return (
    <div class={styles.wrap} aria-hidden="true">
      <div class={styles.header}>
        <span class={styles.bar} style={{ width: "40%" }} />
      </div>
      {Array.from({ length: count }, (_, i) => (
        <div class={styles.row} key={i}>
          <span class={styles.bar} style={{ width: "56px" }} />
          <span class={styles.lines}>
            <span class={styles.bar} style={{ width: `${55 + ((i * 17) % 30)}%` }} />
            <span class={styles.bar} style={{ width: `${35 + ((i * 11) % 25)}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}
