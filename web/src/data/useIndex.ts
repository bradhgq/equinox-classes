import { useCallback, useEffect, useState } from "preact/hooks";
import { buildCatalog, type Catalog } from "../lib/catalog.ts";
import { fetchIndex } from "./api.ts";

export type IndexState =
  | { status: "loading" }
  | { status: "ready"; catalog: Catalog }
  | { status: "error"; message: string; retry: () => void };

/** Loads data/index.json once and builds the lookup catalog. */
export function useIndex(): IndexState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<IndexState>({ status: "loading" });
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    fetchIndex()
      .then((index) => alive && setState({ status: "ready", catalog: buildCatalog(index) }))
      .catch((err: Error) =>
        alive &&
        setState({
          status: "error",
          // Network failures surface as TypeError("Failed to fetch"); say it in plain words (critique L7).
          message: err instanceof TypeError ? "Check your connection and try again." : err.message,
          retry,
        }),
      );
    return () => {
      alive = false;
    };
  }, [attempt]);

  return state;
}
