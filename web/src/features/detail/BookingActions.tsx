import { useRef, useState } from "preact/hooks";
import { displayName } from "../../../../shared/families.ts";
import { classUrl } from "../../../../shared/links.ts";
import { Button } from "../../components/Button/Button.tsx";
import { Popover } from "../../components/Popover/Popover.tsx";
import type { BookingStatus } from "../../lib/booking.ts";
import { downloadText, isApplePlatform } from "../../lib/download.ts";
import type { ResultItem } from "../../lib/results.ts";
import { formatInZone } from "../../lib/time.ts";
import { googleUrlFor, icsFor, reminderEvent } from "./reminder.ts";
import styles from "./ClassDetail.module.css";

interface Props {
  item: ResultItem;
  status: BookingStatus;
}

/**
 * Book / remind. Before booking opens the reminder is the useful action, so it
 * leads; once open, Book leads. Cancelled classes get neither (critique L5).
 */
export function BookingActions({ item, status }: Props) {
  const { c, club } = item;
  const name = displayName(c.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const remindWrap = useRef<HTMLDivElement>(null);

  const book = (variant: "primary" | "secondary") => (
    <Button
      variant={variant}
      href={classUrl(c.classInstanceId)}
      target="_blank"
      rel="noopener"
      iconAfter="external"
      label={`${c.isCancelled ? "View" : "Book"} ${name} on equinox.com (opens in a new tab)`}
    >
      {c.isCancelled ? "View on Equinox" : "Book on Equinox"}
    </Button>
  );

  if (c.isCancelled || status.state === "started") return <div class={styles.actions}>{book("secondary")}</div>;
  if (status.state === "open") return <div class={styles.actions}>{book("primary")}</div>;

  const ev = reminderEvent(item, status);
  const opens = formatInZone(status.opensAt, club.timeZone);
  const downloadIcs = () => downloadText(`book-${c.classInstanceId}.ics`, icsFor(ev), "text/calendar");

  return (
    <div class={styles.actions}>
      <div ref={remindWrap}>
        <Button variant="primary" class={styles.full} icon="calendar" onClick={() => (isApplePlatform() ? downloadIcs() : setMenuOpen(true))}>
          Remind me to book · {opens.weekday} {opens.time}
        </Button>
      </div>
      {book("secondary")}
      <Popover anchor={remindWrap.current} open={menuOpen} onClose={() => setMenuOpen(false)} label="Add reminder to">
        <div class={styles.menu}>
          <Button
            onClick={() => {
              downloadIcs();
              setMenuOpen(false);
            }}
          >
            Calendar file (.ics)
          </Button>
          <Button href={googleUrlFor(ev)} target="_blank" rel="noopener" onClick={() => setMenuOpen(false)}>
            Google Calendar
          </Button>
        </div>
      </Popover>
    </div>
  );
}
