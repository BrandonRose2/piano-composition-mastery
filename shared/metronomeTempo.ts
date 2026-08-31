export const MIN_BPM = 20;
export const MAX_BPM = 220;

/** Keep every tempo adjustment in the playable metronome range. */
export function normalizeTempo(value: number): number {
  if (!Number.isFinite(value)) return 80;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)));
}

/** Empty or non-numeric drafts should not interrupt the current tempo. */
export function parseTempoDraft(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? normalizeTempo(parsed) : null;
}
