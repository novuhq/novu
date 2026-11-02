/*
 * What the agent's ID card (`Agent ID card` in the design) says, wherever it is drawn: on the Configure
 * page, on the public card at `agentinbox.md/p/{handle}`, and in the share image.
 */

/** How the agent stands, in the chip on its portrait. */
export type AgentState = 'active' | 'waiting' | 'paused';

/** How a code to scan is drawn, on a card and in the image Save QR makes: dark on white, as scanners expect. */
export const QR_COLORS = { dark: '#0a0908', light: '#ffffff' } as const;

/** The most bytes a code holds at level L, by version. Version 1 is 21 modules across, and each one adds 4. */
const QR_BYTES_BY_VERSION = [17, 32, 53, 78, 106, 134, 154, 192, 230, 271];

/** How many modules across the code for `value` is, at level L. */
export function qrModulesOf(value: string): number {
  const bytes = new TextEncoder().encode(value).length;
  const version = QR_BYTES_BY_VERSION.findIndex((capacity) => bytes <= capacity) + 1;

  return 17 + 4 * version;
}

/** The date a card was issued, as the card writes it: "Oct 3". In UTC where the reader's zone isn't known. */
export function formatIssuedDate(iso: string, timeZone?: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone });
}
