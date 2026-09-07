/**
 * Formats a duration in milliseconds into a compact human-readable string.
 *
 * Designed for the wizard's pipeline / agent-todo rows and the always-on
 * header timer — short, monospace-friendly, and never wider than a handful
 * of characters.
 *
 * Examples
 * --------
 *  - `formatDuration(0)`        → "0ms"
 *  - `formatDuration(540)`      → "540ms"
 *  - `formatDuration(1_500)`    → "1.5s"
 *  - `formatDuration(12_300)`   → "12s"
 *  - `formatDuration(72_500)`   → "1m12s"
 *  - `formatDuration(3_725_000)` → "1h02m"
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;

  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 10) {
    const tenths = Math.floor((ms % 1000) / 100);

    return `${totalSeconds}.${tenths}s`;
  }
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return `${minutes}m${seconds.toString().padStart(2, '0')}s`;

  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;

  return `${hours}h${remMinutes.toString().padStart(2, '0')}m`;
}

/**
 * Same shape as {@link formatDuration} but always renders a fixed
 * `MM:SS` clock string (or `H:MM:SS` once the run crosses an hour). Used
 * for the always-on header timer where we want the width to stay stable
 * frame-over-frame so the right edge of the band never jitters.
 */
export function formatClock(ms: number): string {
  const safe = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const totalSeconds = Math.floor(safe / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = minutes.toString().padStart(2, '0');
  const ss = seconds.toString().padStart(2, '0');
  if (hours > 0) return `${hours}:${mm}:${ss}`;

  return `${mm}:${ss}`;
}
