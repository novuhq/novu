import { useInput } from 'ink';
import type { ScrollViewRef } from 'ink-scroll-view';
import { useMouseScroll } from './use-mouse-scroll';

export type ScrollAction = 'line-up' | 'line-down' | 'page-up' | 'page-down' | 'top' | 'bottom';

export type ScrollFn = (action: ScrollAction) => void;

const DEFAULT_WHEEL_LINES = 1;

/**
 * Where the hook lives:
 * - `inline`: scrollable region shares the screen with a focused input (composer).
 *   Plain arrow keys are reserved for the input, so scrolling requires modifiers
 *   (Shift+↑/↓ for line, PgUp/PgDn for page, Ctrl/Meta+↑/↓ for top/bottom).
 * - `overlay`: scrollable region owns the screen (modal/full-screen view).
 *   Plain arrow keys scroll line-by-line, plus PgUp/PgDn, g/G top/bottom.
 */
export type ScrollMode = 'inline' | 'overlay';

interface UseScrollKeysOptions {
  isActive?: boolean;
  mode?: ScrollMode;
  /**
   * If true, also enables mouse-wheel scrolling. Wheel up/down maps to
   * `wheelLines` calls of `scroll('line-up' | 'line-down')`. Modifier keys
   * (shift/alt) escalate to `page-up`/`page-down`.
   */
  mouse?: boolean;
  wheelLines?: number;
}

export function useScrollKeys(scroll: ScrollFn, options: UseScrollKeysOptions = {}): void {
  const { isActive = true, mode = 'overlay', mouse = true, wheelLines = DEFAULT_WHEEL_LINES } = options;

  useMouseScroll({
    isActive: isActive && mouse,
    onScroll: (event) => {
      if (event.shift || event.alt) {
        scroll(event.direction === 'up' ? 'page-up' : 'page-down');

        return;
      }
      const action: ScrollAction = event.direction === 'up' ? 'line-up' : 'line-down';
      for (let i = 0; i < Math.max(1, wheelLines); i += 1) {
        scroll(action);
      }
    },
  });

  useInput(
    (input, key) => {
      if (key.pageUp) {
        scroll('page-up');

        return;
      }
      if (key.pageDown) {
        scroll('page-down');

        return;
      }
      if ((key.meta || key.ctrl) && key.upArrow) {
        scroll('top');

        return;
      }
      if ((key.meta || key.ctrl) && key.downArrow) {
        scroll('bottom');

        return;
      }

      if (mode === 'inline') {
        if (key.shift && key.upArrow) {
          scroll('line-up');

          return;
        }
        if (key.shift && key.downArrow) {
          scroll('line-down');
        }

        return;
      }

      if (key.upArrow) {
        scroll('line-up');

        return;
      }
      if (key.downArrow) {
        scroll('line-down');

        return;
      }
      if (input === 'g') {
        scroll('top');

        return;
      }
      if (input === 'G') {
        scroll('bottom');
      }
    },
    { isActive }
  );
}

/**
 * Imperatively apply a `ScrollAction` to a raw `ScrollViewRef` from `ink-scroll-view`.
 * Use this from components that own a `ScrollView` directly (e.g. modal overlays).
 */
export function applyScrollAction(ref: ScrollViewRef | null, action: ScrollAction): void {
  if (!ref) return;
  const viewport = ref.getViewportHeight() || 1;
  switch (action) {
    case 'line-up':
      ref.scrollBy(-1);
      break;
    case 'line-down':
      ref.scrollBy(1);
      break;
    case 'page-up':
      ref.scrollBy(-viewport);
      break;
    case 'page-down':
      ref.scrollBy(viewport);
      break;
    case 'top':
      ref.scrollToTop();
      break;
    case 'bottom':
      ref.scrollToBottom();
      break;
    default:
      break;
  }
}
