import { useId, useRef, useState } from "preact/hooks";
import { displayName } from "../../../../shared/families.ts";
import { classUrl, EQUINOX_APP_URL } from "../../../../shared/links.ts";
import { Button } from "../../components/Button/Button.tsx";
import { Popover } from "../../components/Popover/Popover.tsx";
import { useIsTouch } from "../../hooks/useMediaQuery.ts";
import type { BookingStatus } from "../../lib/booking.ts";
import { downloadText, isApplePlatform } from "../../lib/download.ts";
import { buildIcs, googleCalendarUrl } from "../../lib/ics.ts";
import { reminderEvent } from "../../lib/reminder.ts";
import type { ResultItem } from "../../lib/results.ts";
import { formatInZone } from "../../lib/time.ts";
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
  const isTouch = useIsTouch();
  const appNoteId = useId();

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

  // Phones only. The app opens on its home screen, and the note says so where people can see it:
  // a link to this class in the app isn't possible (apis/README.md; critique r6 M4).
  const app = isTouch && (
    <div class={styles.appLink}>
      <Button variant="text" href={EQUINOX_APP_URL} target="_blank" rel="noopener" iconAfter="external" aria-describedby={appNoteId}>
        Open the Equinox app
      </Button>
      <p id={appNoteId} class={styles.appNote}>
        Opens the app’s home screen, not this class.
      </p>
    </div>
  );

  if (c.isCancelled || status.state === "started") return <div class={styles.actions}>{book("secondary")}</div>;
  if (status.state === "open")
    return (
      <div class={styles.actions}>
        {book("primary")}
        {app}
      </div>
    );

  const ev = reminderEvent(item, status.opensAt);
  const opens = formatInZone(status.opensAt, club.timeZone);
  const downloadIcs = () => downloadText(`book-${c.classInstanceId}.ics`, buildIcs(ev), "text/calendar");

  return (
    <div class={styles.actions}>
      <div ref={remindWrap}>
        <Button variant="primary" class={styles.full} icon="calendar" onClick={() => (isApplePlatform() ? downloadIcs() : setMenuOpen(true))}>
          Remind me to book · {opens.weekday} {opens.time}
        </Button>
      </div>
      {book("secondary")}
      {app}
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
          <Button href={googleCalendarUrl(ev)} target="_blank" rel="noopener" onClick={() => setMenuOpen(false)}>
            Google Calendar
          </Button>
        </div>
      </Popover>
    </div>
  );
}
