import type { ComponentChildren } from "preact";
import { Button } from "../../components/Button/Button.tsx";
import { Sheet } from "../../components/Sheet/Sheet.tsx";
import { isApplePlatform } from "../../lib/download.ts";
import { FEED_BUSY_PER_WEEK, FEED_MAX_EVENTS } from "../../lib/feed.ts";
import { searchPhrase } from "../../lib/filters/summary.ts";
import { useFilters } from "../../state/FiltersContext.tsx";
import { useResults } from "../../state/ResultsContext.tsx";
import type { FilterName } from "../filters/useSummaries.ts";
import { feedLinks, previewScope } from "./subscribe.ts";
import styles from "./SubscribeSheet.module.css";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Opens When or What so the search can be narrowed first. */
  onRevealFilter: (filter: FilterName) => void;
  onNotice: (message: string) => void;
  toast?: ComponentChildren;
}

/**
 * "Subscribe in calendar" (notifications v2a): the current search as a calendar feed, each class
 * at its real time. Busy searches get a nudge to narrow down first; ones too big for a calendar
 * can't be subscribed. Booking-time reminders stay per class ("Remind me to book").
 */
export function SubscribeSheet({ open, onClose, onRevealFilter, onNotice, toast }: Props) {
  const { catalog, filters } = useFilters();
  const { results } = useResults();
  if (!open) return null;

  const links = feedLinks(filters, catalog);
  const scope = previewScope();
  const perWeek = Math.max(1, Math.round(results.count / catalog.weeks));
  const tooMany = results.count > FEED_MAX_EVENTS;
  const busy = !tooMany && perWeek > FEED_BUSY_PER_WEEK;
  const narrow = (filter: FilterName) => {
    onClose();
    onRevealFilter(filter);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(links.https);
      onNotice("Link copied");
    } catch {
      onNotice("Couldn’t copy the link");
    }
  };

  const apple = (
    <Button variant={isApplePlatform() ? "primary" : "secondary"} href={links.webcal} icon="calendar">
      Apple Calendar
    </Button>
  );
  const google = (
    <Button variant={isApplePlatform() ? "secondary" : "primary"} href={links.google} target="_blank" rel="noopener" iconAfter="external">
      Google Calendar
    </Button>
  );

  return (
    <Sheet open fit title="Subscribe in calendar" onClose={onClose} toast={toast} returnFocusKey="subscribe">
      {/* Too many: lead with the limit instead of promising a calendar (critique r6 L5). */}
      <p class={styles.lede}>
        {tooMany
          ? "Too many classes for one calendar."
          : "Every class in this search, in your calendar at the time it starts. It updates as Equinox adds classes or changes the schedule."}
      </p>

      <p class={styles.search}>{searchPhrase(filters, catalog)}</p>
      <p class={styles.rate}>
        {tooMany ? `${results.count.toLocaleString()} classes` : `About ${perWeek} ${perWeek === 1 ? "class" : "classes"} a week`}
      </p>

      {(busy || tooMany) && (
        <div class={styles.narrow}>
          <p>{tooMany ? "Narrow it down to subscribe:" : "That’s a lot for one calendar. Narrow it down first?"}</p>
          <div class={styles.narrowActions}>
            <Button size="sm" onClick={() => narrow("when")}>
              When
            </Button>
            <Button size="sm" onClick={() => narrow("what")}>
              What
            </Button>
          </div>
        </div>
      )}

      {!tooMany && (
        <div class={styles.actions}>
          {isApplePlatform() ? (
            <>
              {apple}
              {google}
            </>
          ) : (
            <>
              {google}
              {apple}
            </>
          )}
          <Button variant="text" onClick={copy}>
            Copy link (Outlook, others)
          </Button>
        </div>
      )}

      {!tooMany && (
        <ol class={styles.notes}>
          <li>Each class’s notes say when booking opens, with a link to book.</li>
          <li>For a nudge when booking opens, use “Remind me to book” on a class.</li>
          <li>Google Calendar refreshes subscriptions about once a day.</li>
          <li>It keeps this search: changing your filters later won’t change it.</li>
          {scope === "computer" && <li>Local preview: only calendars on this computer can reach it, not Google or your phone.</li>}
          {scope === "network" && <li>Preview on your network: Apple Calendar on devices on this Wi-Fi can reach it. Google can’t.</li>}
        </ol>
      )}
    </Sheet>
  );
}
