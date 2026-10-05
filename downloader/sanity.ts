// Publish guard: a build that lost most of its classes (API outage, response
// format change, half the raw cache missing) must not replace good data.

export interface PublishDecision {
  publish: boolean;
  reason: string;
}

/**
 * @param prevTotal total classes in the currently published index.json, or null if none / unreadable
 * @param newTotal total classes in the new build
 */
export function decidePublish(prevTotal: number | null, newTotal: number, force: boolean): PublishDecision {
  const change = prevTotal === null ? `no previous index.json; ${newTotal} classes` : `${prevTotal} -> ${newTotal} classes`;
  if (force) return { publish: true, reason: `--force (${change})` };
  if (newTotal === 0) return { publish: false, reason: `new build has no classes (${change})` };
  if (prevTotal !== null && newTotal * 2 < prevTotal) {
    return { publish: false, reason: `class count dropped by more than half (${change})` };
  }
  return { publish: true, reason: change };
}
