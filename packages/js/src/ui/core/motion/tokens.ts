/**
 * The JS mirror of the `--nv-motion-*` tokens declared on `.novu` in `index.css`, for animations started from code
 * (the Web Animations API). A test keeps the two in sync.
 */
export const MOTION_DURATION_MS = { fast: 120, base: 160, slow: 220 } as const;

export const MOTION_EASING = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

export const MOTION_DISTANCE_PX = { sm: 4, md: 8, lg: 12 } as const;

export type MotionDurationToken = keyof typeof MOTION_DURATION_MS;

const parseCssTimeMs = (value: string): number | undefined => {
  const trimmed = value.trim();
  const number = Number.parseFloat(trimmed);
  if (Number.isNaN(number)) {
    return undefined;
  }
  if (trimmed.endsWith('ms')) {
    return number;
  }
  if (trimmed.endsWith('s')) {
    return number * 1000;
  }

  return undefined;
};

/**
 * The duration of a token as `el` sees it: a host's override of the variable wins, the `reduced` mode caps it and the
 * `off` mode reads 0. Falls back to the constant when the variable is missing (no stylesheet, as in tests).
 */
export const readMotionDurationMs = (el: Element, token: MotionDurationToken): number => {
  const value = getComputedStyle(el).getPropertyValue(`--nv-motion-duration-${token}`);

  return parseCssTimeMs(value) ?? MOTION_DURATION_MS[token];
};
