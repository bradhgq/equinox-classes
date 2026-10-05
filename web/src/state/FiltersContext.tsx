import { type ComponentChildren, createContext } from "preact";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Catalog } from "../lib/catalog.ts";
import { decodeFilters, encodeFilters } from "../lib/filters/codec.ts";
import type { Filters } from "../lib/filters/types.ts";
import { EMPTY_MEMORY, type WhenMemory, type WhenUpdate } from "../lib/filters/when.ts";
import {
  readSavedQuery,
  readTemporaryView,
  refreshServerCookie,
  takeSharedQuery,
  writeSavedQuery,
  writeTemporaryView,
} from "./persistence.ts";

/** How the current filters relate to a shared link (handoff §7). */
export type SharedState =
  | { mode: "none" }
  | { mode: "temporary"; dropped: number } // viewing someone's link; cookie untouched
  | { mode: "adopted"; dropped: number }; // first visit: the link became your filters

export interface UndoRequest {
  label: string;
  undo: () => void;
}

interface FiltersApi {
  catalog: Catalog;
  filters: Filters;
  memory: WhenMemory;
  shared: SharedState;
  /** Change filters. Pass `undoLabel` for bulk/destructive changes to offer an Undo toast. */
  update: (next: (f: Filters) => Filters, opts?: { undoLabel?: string }) => void;
  /** Change When filters together with the When session memory. */
  updateWhen: (next: (f: Filters, m: WhenMemory) => WhenUpdate, opts?: { undoLabel?: string }) => void;
  keepShared: () => void;
  clearShared: () => void;
  dismissShared: () => void;
}

const Ctx = createContext<FiltersApi | null>(null);

export function useFilters(): FiltersApi {
  const api = useContext(Ctx);
  if (!api) throw new Error("useFilters outside FiltersProvider");
  return api;
}

interface InitialState {
  filters: Filters;
  shared: SharedState;
  /** Saved items (cookie) that are no longer in the data (critique M8: say so). */
  savedDropped: number;
}

/** Decide the starting filters from the cookie, a shared link, or a view kept in this tab. */
function initialState(catalog: Catalog): InitialState {
  const savedDecoded = decodeFilters(readSavedQuery(), catalog);
  const saved = savedDecoded.filters;
  const savedQuery = encodeFilters(saved, catalog);
  const savedDropped = savedDecoded.dropped;
  const sharedQuery = takeSharedQuery();

  if (sharedQuery !== null) {
    const link = decodeFilters(sharedQuery, catalog);
    if (link.recognized) {
      const linkQuery = encodeFilters(link.filters, catalog);
      if (savedQuery === "") {
        writeSavedQuery(linkQuery);
        writeTemporaryView(null);
        return { filters: link.filters, shared: { mode: "adopted", dropped: link.dropped }, savedDropped: 0 };
      }
      if (linkQuery === savedQuery) return { filters: saved, shared: { mode: "none" }, savedDropped };
      writeTemporaryView(linkQuery);
      return { filters: link.filters, shared: { mode: "temporary", dropped: link.dropped }, savedDropped: 0 };
    }
  }

  const view = readTemporaryView();
  if (view !== null && view !== savedQuery) {
    return { filters: decodeFilters(view, catalog).filters, shared: { mode: "temporary", dropped: 0 }, savedDropped: 0 };
  }
  return { filters: saved, shared: { mode: "none" }, savedDropped };
}

interface Props {
  catalog: Catalog;
  onUndoable: (request: UndoRequest) => void;
  /** Plain notices (no action), e.g. "Saved as your filters". */
  onNotice: (message: string) => void;
  children: ComponentChildren;
}

export function FiltersProvider({ catalog, onUndoable, onNotice, children }: Props) {
  const [initial] = useState(() => initialState(catalog));
  useEffect(() => {
    const n = initial.savedDropped;
    if (n > 0) onNotice(`${n} saved ${n === 1 ? "item" : "items"} no longer listed`);
  }, []);
  const [filters, setFilters] = useState<Filters>(initial.filters);
  const [memory, setMemory] = useState<WhenMemory>(EMPTY_MEMORY);
  const [shared, setShared] = useState<SharedState>(initial.shared);
  const current = useRef({ filters, memory, shared });
  current.current = { filters, memory, shared };

  // Persist (debounced) unless we're only viewing someone's shared link.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      refreshServerCookie(); // slide the server cookie's expiry on every visit
      return;
    }
    if (shared.mode === "temporary") return;
    const t = setTimeout(() => writeSavedQuery(encodeFilters(filters, catalog)), 300);
    return () => clearTimeout(t);
  }, [filters, shared.mode]);

  const apply = useCallback(
    (nextFilters: Filters, nextMemory: WhenMemory, undoLabel?: string) => {
      const prev = current.current;
      if (prev.shared.mode === "temporary") {
        // Editing a shared view counts as keeping it; say so (critique L10).
        writeTemporaryView(null);
        setShared({ mode: "none" });
        onNotice("Saved as your filters");
      }
      // Update the ref now, not at the next render, so two changes in the same tick
      // (e.g. two quick taps) each build on the latest state instead of the first being lost.
      current.current = { filters: nextFilters, memory: nextMemory, shared: prev.shared.mode === "temporary" ? { mode: "none" } : prev.shared };
      setFilters(nextFilters);
      setMemory(nextMemory);
      if (undoLabel) {
        onUndoable({
          label: undoLabel,
          undo: () => {
            setFilters(prev.filters);
            setMemory(prev.memory);
          },
        });
      }
    },
    [onUndoable, onNotice],
  );

  const api = useMemo<FiltersApi>(
    () => ({
      catalog,
      filters,
      memory,
      shared,
      update: (next, opts) => apply(next(current.current.filters), current.current.memory, opts?.undoLabel),
      updateWhen: (next, opts) => {
        const u = next(current.current.filters, current.current.memory);
        apply(u.filters, u.memory, opts?.undoLabel);
      },
      keepShared: () => {
        writeTemporaryView(null);
        writeSavedQuery(encodeFilters(current.current.filters, catalog));
        setShared({ mode: "none" });
      },
      clearShared: () => {
        writeTemporaryView(null);
        setFilters(decodeFilters(readSavedQuery(), catalog).filters);
        setMemory(EMPTY_MEMORY);
        setShared({ mode: "none" });
      },
      dismissShared: () => setShared({ mode: "none" }),
    }),
    [catalog, filters, memory, shared, apply],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

