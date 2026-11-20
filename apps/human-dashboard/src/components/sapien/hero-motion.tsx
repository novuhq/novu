'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';

const motionQuery = '(prefers-reduced-motion: reduce)';
function subscribeToMotion(onChange: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

type Mode = 'auto' | 'playing' | 'paused';
/** Reasons the hero holds its current state without changing the toggle. */
export type HeroHold = 'hover' | 'focus';

type HeroMotion = {
  /** Whether the visitor paused the hero with the caption toggle. */
  paused: boolean;
  /** Rotation is switched on: by default, or by the toggle under reduced motion. */
  rotating: boolean;
  /** Rotating and not held by hover, keyboard focus or a hidden tab. */
  running: boolean;
  reducedMotion: boolean;
  toggle: () => void;
  hold: (reason: HeroHold, held: boolean) => void;
};

const HeroMotionContext = createContext<HeroMotion | null>(null);

/**
 * Shared play state for everything that moves in the hero (the title's pill word
 * and the card stack), so one toggle and the same hover/focus/hidden-tab rules
 * pause both. Renders no markup.
 */
export function HeroMotionProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('auto');
  const [holds, setHolds] = useState<Record<HeroHold, boolean>>({
    hover: false,
    focus: false,
  });
  const [hidden, setHidden] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeToMotion,
    () => window.matchMedia(motionQuery).matches,
    () => false
  );

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const rotating = mode === 'playing' || (mode === 'auto' && !reducedMotion);
  const running = rotating && !holds.hover && !holds.focus && !hidden;
  const toggle = useCallback(() => setMode(rotating ? 'paused' : 'playing'), [rotating]);
  const hold = useCallback(
    (reason: HeroHold, held: boolean) =>
      setHolds((current) => (current[reason] === held ? current : { ...current, [reason]: held })),
    []
  );
  const value = useMemo(
    () => ({
      paused: mode === 'paused',
      rotating,
      running,
      reducedMotion,
      toggle,
      hold,
    }),
    [mode, rotating, running, reducedMotion, toggle, hold]
  );
  return <HeroMotionContext.Provider value={value}>{children}</HeroMotionContext.Provider>;
}

export function useHeroMotion() {
  const motion = useContext(HeroMotionContext);
  if (!motion) throw new Error('useHeroMotion must be used inside <HeroMotionProvider>');
  return motion;
}

/**
 * Calls `advance` once `interval` ms have passed while the hero is running. The
 * countdown restarts whenever `step` changes and after every hold or pause.
 */
export function useHeroTimer(interval: number, step: number, advance: () => void) {
  const { running } = useHeroMotion();
  const onElapsed = useEffectEvent(advance);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `step` restarts the countdown on purpose; an effect event (`onElapsed`) is never a dependency
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(onElapsed, interval);
    return () => window.clearTimeout(timer);
  }, [running, interval, step]);
}
