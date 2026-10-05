import { Button } from "../../components/Button/Button.tsx";
import { EmptyState } from "../../components/EmptyState/EmptyState.tsx";
import { SkeletonRows } from "../../components/Skeleton/Skeleton.tsx";
import { encodeFilters } from "../../lib/filters/codec.ts";
import { hasWhen } from "../../lib/filters/types.ts";
import { allClasses, isAnyClass, isNoClass } from "../../lib/filters/what.ts";
import type { ResultItem } from "../../lib/results.ts";
import { useFilters } from "../../state/FiltersContext.tsx";
import { isSettled, useResults } from "../../state/ResultsContext.tsx";
import { FirstRun } from "../firstrun/FirstRun.tsx";
import type { FilterName } from "../filters/useSummaries.ts";
import { Agenda } from "./Agenda.tsx";
import { ClubLoadError } from "./ClubLoadError.tsx";
import { MetaLine } from "./MetaLine.tsx";
import { NarrowHint } from "./NarrowHint.tsx";
import { NoMatches } from "./NoMatches.tsx";
import { useSkeletonHold } from "./useSkeletonHold.ts";

interface Props {
  hasClubs: boolean;
  nowMs: number;
  onOpenClass: (item: ResultItem) => void;
  onRevealFilter: (filter: FilterName) => void;
}

/** The main column: first run, loading, errors, nothing picked, no matches, or the agenda. */
export function Results({ hasClubs, nowMs, onOpenClass, onRevealFilter }: Props) {
  const { catalog, filters, update } = useFilters();
  const { results, loading, failedIds, retry } = useResults();
  const holding = useSkeletonHold(loading);
  if (!hasClubs) return <FirstRun />;

  if (isNoClass(filters)) {
    return (
      <EmptyState
        title="No classes picked."
        text="Choose which classes to show."
        actions={
          <>
            <Button variant="primary" onClick={() => onRevealFilter("what")}>
              Choose classes
            </Button>
            <Button onClick={() => update((f) => allClasses(f, catalog))}>Any class</Button>
          </>
        }
      />
    );
  }

  const nothingLoaded = loading.loaded === 0 && !isSettled(loading);
  const stillLoading = !isSettled(loading);

  return (
    <>
      <MetaLine count={results.count} loading={loading} generatedAt={catalog.index.generatedAt} nowMs={nowMs} />
      {!hasWhen(filters) && isAnyClass(filters, catalog) && <NarrowHint onReveal={onRevealFilter} />}
      {failedIds.map((id) => (
        <ClubLoadError key={id} name={catalog.clubs.get(id)?.shortName ?? id} onRetry={() => retry(id)} />
      ))}
      {nothingLoaded || holding ? (
        <SkeletonRows />
      ) : results.days.length === 0 && !stillLoading ? (
        <NoMatches />
      ) : (
        <Agenda
          days={results.days}
          resetKey={encodeFilters(filters, catalog)}
          multiClub={results.multiClub}
          multiZone={results.multiZone}
          nowMs={nowMs}
          onOpen={onOpenClass}
        />
      )}
    </>
  );
}
