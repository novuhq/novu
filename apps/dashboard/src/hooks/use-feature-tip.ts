import { useCallback, useRef } from 'react';

type TipConfig = {
  id: string;
  message: string;
  showAfterClicks?: number;
  cooldownHours?: number;
};

type TipState = {
  clickCount: number;
  lastShownAt: number | null;
};

const STORAGE_KEY = 'novu-feature-tips';
const DEBUG_FLAG = 'novu-feature-tips-debug';
const DEFAULT_COOLDOWN_HOURS = 0;
const DEFAULT_SHOW_AFTER_CLICKS = 1;
const MAX_CLICK_COUNT = 1000;
const MAX_STORAGE_AGE_MS = 365 * 24 * 60 * 60 * 1000;

function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

function isDebugMode(): boolean {
  if (!isLocalStorageAvailable()) {
    return false;
  }

  try {
    return localStorage.getItem(DEBUG_FLAG) === 'true';
  } catch {
    return false;
  }
}

function getTipState(tipId: string): TipState {
  if (!isLocalStorageAvailable()) {
    return { clickCount: 0, lastShownAt: null };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { clickCount: 0, lastShownAt: null };
    }

    const parsed = JSON.parse(stored);

    if (typeof parsed !== 'object' || parsed === null) {
      return { clickCount: 0, lastShownAt: null };
    }

    const tipState = parsed[tipId];
    if (!tipState || typeof tipState !== 'object') {
      return { clickCount: 0, lastShownAt: null };
    }

    const clickCount = typeof tipState.clickCount === 'number' ? Math.min(tipState.clickCount, MAX_CLICK_COUNT) : 0;
    const lastShownAt =
      typeof tipState.lastShownAt === 'number' && tipState.lastShownAt > 0 ? tipState.lastShownAt : null;

    if (lastShownAt !== null && Date.now() - lastShownAt > MAX_STORAGE_AGE_MS) {
      return { clickCount: 0, lastShownAt: null };
    }

    return { clickCount, lastShownAt };
  } catch {
    return { clickCount: 0, lastShownAt: null };
  }
}

function saveTipState(tipId: string, state: TipState): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let allTips: Record<string, TipState> = {};

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (typeof parsed === 'object' && parsed !== null) {
          allTips = parsed;
        }
      } catch {
        allTips = {};
      }
    }

    allTips[tipId] = state;

    const toStore = JSON.stringify(allTips);
    if (toStore.length > 10000) {
      const entries = Object.entries(allTips);
      const sorted = entries.sort((a, b) => (b[1].lastShownAt || 0) - (a[1].lastShownAt || 0));
      allTips = Object.fromEntries(sorted.slice(0, 10));
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(allTips));
  } catch {
    // Silently fail if localStorage quota is exceeded or unavailable
  }
}

function shouldShowTip(state: TipState, showAfterClicks: number, cooldownHours: number): boolean {
  if (state.clickCount < showAfterClicks) {
    return false;
  }

  if (cooldownHours <= 0) {
    return state.clickCount === showAfterClicks;
  }

  const now = Date.now();
  const cooldownMs = cooldownHours * 60 * 60 * 1000;

  if (state.lastShownAt === null) {
    return true;
  }

  const timeSinceLastShown = now - state.lastShownAt;
  return timeSinceLastShown >= cooldownMs;
}

export function useFeatureTip(config: TipConfig) {
  const {
    id: tipId,
    message,
    showAfterClicks = DEFAULT_SHOW_AFTER_CLICKS,
    cooldownHours = DEFAULT_COOLDOWN_HOURS,
  } = config;

  const lastTrackedRef = useRef<number>(0);
  const DEBOUNCE_MS = 100;

  const trackInteraction = useCallback((): boolean => {
    if (isDebugMode()) {
      return true;
    }

    const now = Date.now();

    if (now - lastTrackedRef.current < DEBOUNCE_MS) {
      return false;
    }

    lastTrackedRef.current = now;

    const currentState = getTipState(tipId);
    const newClickCount = Math.min(currentState.clickCount + 1, MAX_CLICK_COUNT);

    const newState: TipState = {
      clickCount: newClickCount,
      lastShownAt: currentState.lastShownAt,
    };

    const shouldShow = shouldShowTip(newState, showAfterClicks, cooldownHours);

    if (shouldShow) {
      newState.lastShownAt = Date.now();
    }

    saveTipState(tipId, newState);

    return shouldShow;
  }, [tipId, showAfterClicks, cooldownHours]);

  const reset = useCallback(() => {
    saveTipState(tipId, { clickCount: 0, lastShownAt: null });
    lastTrackedRef.current = 0;
  }, [tipId]);

  return {
    trackInteraction,
    reset,
    message,
  };
}
