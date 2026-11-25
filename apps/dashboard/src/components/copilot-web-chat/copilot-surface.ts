/**
 * Marks the Copilot's root elements (the launcher and the popover), which float above sheets. Spread it on an element:
 * `<div {...COPILOT_SURFACE_PROPS}>`.
 */
export const COPILOT_SURFACE_PROPS = { 'data-copilot-surface': '' } as const;

const COPILOT_SURFACE_SELECTOR = '[data-copilot-surface]';

/**
 * Whether an event target sits inside the Copilot launcher or popover. Sheets use it to stay open when the Copilot is
 * clicked or focused, since Radix counts both as an outside interaction that dismisses them.
 */
export function isInCopilotSurface(target: EventTarget | null): boolean {
  const closest = (target as { closest?: unknown } | null)?.closest;

  return typeof closest === 'function' && closest.call(target, COPILOT_SURFACE_SELECTOR) != null;
}
