import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { Button } from "../Button/Button.tsx";
import styles from "./ClampedText.module.css";

interface Props {
  text: string;
  lines?: number;
}

/** A paragraph clamped to a few lines; MORE appears only if it actually overflows (critique L5). */
export function ClampedText({ text, lines = 3 }: Props) {
  const para = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = para.current;
    if (el && !expanded) setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [text, expanded]);

  return (
    <div>
      <p ref={para} class={expanded ? undefined : styles.clamped} style={{ "--lines": lines }}>
        {text}
      </p>
      {overflows && !expanded && (
        <Button variant="text" size="sm" class={styles.more} onClick={() => setExpanded(true)}>
          More
        </Button>
      )}
    </div>
  );
}
