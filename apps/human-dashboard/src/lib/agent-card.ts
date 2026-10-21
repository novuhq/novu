/*
 * What the agent's ID card (`Agent ID card` in the design) says, wherever it is drawn: on the Configure
 * page, on the public card at `agentinbox.md/p/{handle}`, and in the share image.
 */

/** How the agent stands, in the chip on its portrait. */
export type AgentState = 'active' | 'waiting' | 'paused';

/** What the card's code to scan holds: a new email to the agent. */
export function qrValueOf(address: string): string {
  return `mailto:${address}`;
}

/** The date a card was issued, as the card writes it: "Oct 3". In UTC where the reader's zone isn't known. */
export function formatIssuedDate(iso: string, timeZone?: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone });
}
