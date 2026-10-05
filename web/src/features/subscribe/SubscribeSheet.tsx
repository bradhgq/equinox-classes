import type { ComponentChildren } from "preact";
import { Button } from "../../components/Button/Button.tsx";
import { Sheet } from "../../components/Sheet/Sheet.tsx";
import { isApplePlatform } from "../../lib/download.ts";
import { FEED_BUSY_PER_WEEK, FEED_MAX_EVENTS } from "../../lib/feed.ts";
import { searchPhrase } from "../../lib/filters/summary.ts";
import { useFilters } from "../../state/FiltersContext.tsx";
import { useResults } from "../../state/ResultsContext.tsx";
import type { FilterName } from "../filters/useSummaries.ts";
import { feedLinks, isLocalPreview } from "./subscribe.ts";
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
 * "Subscribe in calendar" (notifications v2a): the current search as a calendar feed with an
 * event, and alert, the moment booking opens for each class. Busy searches get a nudge to
 * narrow down first; ones too big for a calendar can't be subscribed.
 */
export function SubscribeSheet({ open, onClose, onRevealFilter, onNotice, toast }: Props) {
  const { catalog, filters } = useFilters();
  const { results } = useResults();
  if (!open) return null;

  const links = feedLinks(filters, catalog);
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
      <p class={styles.lede}>A calendar alert the moment booking opens, for every class in this search. New classes show up as Equinox publishes them.</p>

      <p class={styles.search}>{searchPhrase(filters, catalog)}</p>
      <p class={styles.rate}>
        {tooMany ? `${results.count.toLocaleString()} classes: too many for a calendar` : `About ${perWeek} ${perWeek === 1 ? "alert" : "alerts"} a week`}
      </p>

      {(busy || tooMany) && (
        <div class={styles.narrow}>
          <p>{tooMany ? "Narrow it down to subscribe." : "That’s a lot of alerts. Narrow it down first?"}</p>
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

      <ol class={styles.notes}>
        <li>Each alert is a 15-minute event when booking opens, 26 hours before class.</li>
        <li>Apple Calendar: keep alerts on. If it asks, turn off “Remove Alerts”.</li>
        <li>Google Calendar: in the calendar’s settings, add a notification at 0 minutes. Google refreshes about once a day.</li>
        <li>It keeps this search: changing your filters later won’t change it.</li>
        {isLocalPreview() && <li>Local preview: only calendars on this computer can reach it, not Google or your phone.</li>}
      </ol>
    </Sheet>
  );
}
