import type { Middleware, Placement } from '@floating-ui/dom';
import { type Accessor, createContext, useContext } from 'solid-js';

export type FloatingSide = 'top' | 'right' | 'bottom' | 'left';
export type FloatingAlign = 'start' | 'center' | 'end';

export const getSide = (placement: Placement): FloatingSide => placement.split('-')[0] as FloatingSide;

export const getAlign = (placement: Placement): FloatingAlign =>
  (placement.split('-')[1] as FloatingAlign | undefined) ?? 'center';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Rounds a coordinate of a floating element to whole device pixels. At a fractional position the browser draws the
 * element's text slightly off while it animates and redraws it in place when the animation ends, so the content
 * visibly twitches once it has appeared.
 */
export const roundToDevicePixel = (value: number): number => {
  const ratio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;

  return Math.round(value * ratio) / ratio;
};

/**
 * Points the floating element's transform origin at the centre of its trigger, so it grows out of the trigger and
 * shrinks back into it. Read the result from `middlewareData.transformOrigin.value`. Place it last: it needs the
 * position that `flip` and `shift` settled on.
 */
export const transformOrigin = (): Middleware => ({
  name: 'transformOrigin',
  fn: ({ placement, rects, x, y }) => {
    const side = getSide(placement);
    const referenceCenterX = rects.reference.x + rects.reference.width / 2 - x;
    const referenceCenterY = rects.reference.y + rects.reference.height / 2 - y;
    let originX = clamp(referenceCenterX, 0, rects.floating.width);
    let originY = clamp(referenceCenterY, 0, rects.floating.height);
    if (side === 'bottom') {
      originY = 0;
    } else if (side === 'top') {
      originY = rects.floating.height;
    } else if (side === 'right') {
      originX = 0;
    } else {
      originX = rects.floating.width;
    }

    return { data: { value: `${originX}px ${originY}px` } };
  },
});

/**
 * The overlay an element is rendered in. A nested overlay (a menu inside the Inbox, a tooltip inside a menu) stays
 * present only while its parent is, so closing the parent plays the exit of both at once.
 */
export const FloatingLayerContext = createContext<{ present: Accessor<boolean> }>();

export const useParentLayerPresent = (): Accessor<boolean> => {
  const layer = useContext(FloatingLayerContext);

  return () => layer?.present() ?? true;
};
