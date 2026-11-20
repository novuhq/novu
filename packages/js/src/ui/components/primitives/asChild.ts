import type { JSX } from 'solid-js';

/** The event a `<button>` handler receives, as `JSX.EventHandlerUnion` spells it out. */
type ButtonMouseEvent = MouseEvent & { currentTarget: HTMLButtonElement; target: Element };

/**
 * Calls a button handler prop from a wrapping handler, which only has the plain `MouseEvent` in hand. Like the
 * handlers it replaces, it forwards plain functions only, not Solid's bound `[handler, data]` form.
 */
export const callButtonHandler = (
  handler: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent> | undefined,
  event: MouseEvent
) => {
  if (typeof handler === 'function') {
    handler(event as ButtonMouseEvent);
  }
};
