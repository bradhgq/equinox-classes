import { useCallback, useMemo, useState } from "preact/hooks";
import { SkeletonRows } from "./components/Skeleton/Skeleton.tsx";
import { Toast, type ToastMessage } from "./components/Toast/Toast.tsx";
import { useIndex } from "./data/useIndex.ts";
import { useSchedules } from "./data/useSchedules.ts";
import { ClassDetail } from "./features/detail/ClassDetail.tsx";
import { FilterBar } from "./features/filters/FilterBar.tsx";
import { FilterRail } from "./features/filters/FilterRail.tsx";
import { FilterSheets } from "./features/filters/FilterSheets.tsx";
import type { FilterName } from "./features/filters/useSummaries.ts";
import { Footer } from "./features/footer/Footer.tsx";
import { Header } from "./features/header/Header.tsx";
import { LoadError } from "./features/results/LoadError.tsx";
import { Results } from "./features/results/Results.tsx";
import { ShareFallback } from "./features/share/ShareFallback.tsx";
import { SharedBanner } from "./features/share/SharedBanner.tsx";
import { buildSharePayload, sharePayload } from "./features/share/share.ts";
import { useIsDesktop } from "./hooks/useMediaQuery.ts";
import { useNow } from "./hooks/useNow.ts";
import type { Filters } from "./lib/filters/types.ts";
import { effectiveClubIds } from "./lib/filters/where.ts";
import { buildResults, classCounts, type ResultItem } from "./lib/results.ts";
import { FiltersProvider, type UndoRequest, useFilters } from "./state/FiltersContext.tsx";
import { ResultsContext } from "./state/ResultsContext.tsx";
import styles from "./App.module.css";

let toastId = 0;
type ShowToast = (t: Omit<ToastMessage, "id">) => void;

/** Loads the index, then hands off to the filter-aware app. */
export function App() {
  const index = useIndex();
  const isDesktop = useIsDesktop();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const showToast = useCallback<ShowToast>((t) => setToast({ ...t, id: ++toastId }), []);
  const dismissToast = useCallback(() => setToast(null), []);
  const offerUndo = useCallback(
    (r: UndoRequest) => showToast({ message: r.label, action: { label: "Undo", run: r.undo }, durationMs: 5000 }),
    [showToast],
  );
  const notice = useCallback((message: string) => showToast({ message, durationMs: 4000 }), [showToast]);

  if (index.status !== "ready") {
    return (
      <div class={styles.page}>
        <Header canShare={false} onShare={() => {}} isDesktop={isDesktop} />
        {index.status === "loading" ? <SkeletonRows /> : <LoadError message={index.message} onRetry={index.retry} />}
      </div>
    );
  }

  return (
    <FiltersProvider catalog={index.catalog} onUndoable={offerUndo} onNotice={notice}>
      <Main isDesktop={isDesktop} toast={toast} showToast={showToast} dismissToast={dismissToast} />
    </FiltersProvider>
  );
}

interface MainProps {
  isDesktop: boolean;
  toast: ToastMessage | null;
  showToast: ShowToast;
  dismissToast: () => void;
}

function Main({ isDesktop, toast, showToast, dismissToast }: MainProps) {
  const { catalog, filters } = useFilters();
  const nowMs = useNow();
  const clubIds = useMemo(() => effectiveClubIds(filters, catalog), [filters, catalog]);
  const { schedules, loadedCount, failedIds, total, retry } = useSchedules(clubIds);
  const results = useMemo(() => buildResults(catalog, filters, schedules, nowMs), [catalog, filters, schedules, nowMs]);
  const counts = useMemo(() => classCounts(catalog, schedules), [catalog, schedules]);
  const resultsWith = useCallback((f: Filters) => buildResults(catalog, f, schedules, nowMs), [catalog, schedules, nowMs]);

  const [sheet, setSheet] = useState<FilterName | null>(null);
  const [detail, setDetail] = useState<ResultItem | null>(null);
  const [reveal, setReveal] = useState<{ panel: FilterName; nonce: number } | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  const share = async (shareButton: HTMLElement) => {
    const payload = buildSharePayload(filters, catalog);
    const outcome = await sharePayload(payload);
    // Under the shared-search banner when it's showing, so the toast doesn't land on it (critique L10).
    const anchor = document.querySelector<HTMLElement>("[data-banner]") ?? shareButton;
    if (outcome === "copied") showToast({ message: "Link copied", anchor, durationMs: 2000 });
    if (outcome === "failed") setFallbackUrl(payload.url);
  };
  const revealFilter = (panel: FilterName) => (isDesktop ? setReveal({ panel, nonce: Date.now() }) : setSheet(panel));
  const description = detail ? schedules.find((s) => s.clubId === detail.club.id)?.descriptions[String(detail.c.classId)] : undefined;
  const hasClubs = clubIds.length > 0;
  const modalOpen = (!isDesktop && sheet !== null) || detail !== null || fallbackUrl !== null;
  // While a sheet is open its toast renders inside it, so Undo is reachable (critique M1).
  const inlineToast = <Toast toast={toast} onDismiss={dismissToast} inline />;

  const resultsApi = useMemo(
    () => ({ results, resultsWith, counts, loading: { loaded: loadedCount, failed: failedIds.length, total, clubKey: clubIds.join(",") }, failedIds, retry }),
    [results, resultsWith, counts, loadedCount, failedIds, total, clubIds, retry],
  );
  const resultsView = <Results hasClubs={hasClubs} nowMs={nowMs} onOpenClass={setDetail} onRevealFilter={revealFilter} />;

  return (
    <ResultsContext.Provider value={resultsApi}>
      <a class={styles.skip} href="#results">
        Skip to classes
      </a>
      {/* Everything behind a sheet is inert, so focus and screen readers stay in the sheet. */}
      <div class={styles.page} inert={modalOpen}>
        <Header canShare={hasClubs} onShare={share} isDesktop={isDesktop} />
        <SharedBanner />
        {isDesktop ? (
          <div class={styles.desktop}>
            <FilterRail reveal={reveal} />
            <main id="results" class={styles.results} tabIndex={-1}>
              {resultsView}
              <Footer generatedAt={catalog.index.generatedAt} nowMs={nowMs} />
            </main>
          </div>
        ) : (
          <>
            <FilterBar onOpen={setSheet} />
            <main id="results" class={styles.mobile} tabIndex={-1}>
              {resultsView}
            </main>
            <Footer generatedAt={catalog.index.generatedAt} nowMs={nowMs} />
          </>
        )}
      </div>
      {!isDesktop && <FilterSheets open={sheet} onClose={() => setSheet(null)} toast={inlineToast} />}
      <ClassDetail
        key={detail ? `${detail.club.id}-${detail.c.classInstanceId}` : "none"}
        item={detail}
        description={description}
        nowMs={nowMs}
        onClose={() => setDetail(null)}
        toast={inlineToast}
      />
      <ShareFallback url={fallbackUrl} onClose={() => setFallbackUrl(null)} />
      {!modalOpen && <Toast toast={toast} onDismiss={dismissToast} />}
    </ResultsContext.Provider>
  );
}
