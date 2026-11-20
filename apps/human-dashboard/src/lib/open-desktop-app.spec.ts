import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { openDesktopApp } from './open-desktop-app';

const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15';

type Frame = { hidden: boolean; src: string; removed: boolean; remove: () => void };

/** Just enough of a browser tab: where it is, whether it has the focus, and the tabs and frames it opens. */
function browserTab(userAgent: string) {
  const listeners = new Set<() => void>();
  const tab = {
    focused: true,
    location: { href: 'https://www.agentinbox.md/configure' },
    opened: [] as string[],
    frames: [] as Frame[],
  };
  const events = {
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  };

  vi.stubGlobal('navigator', { userAgent });
  vi.stubGlobal('window', {
    ...events,
    location: tab.location,
    open: (url: string) => {
      tab.opened.push(url);

      return null;
    },
  });
  vi.stubGlobal('document', {
    ...events,
    hasFocus: () => tab.focused,
    body: { append: () => undefined },
    createElement: () => {
      const frame: Frame = {
        hidden: false,
        src: '',
        removed: false,
        remove: () => {
          frame.removed = true;
        },
      };
      tab.frames.push(frame);

      return frame;
    },
  });

  return {
    tab,
    /** What a browser does when it hands the link to an app: the page loses the focus. */
    handOver: () => {
      tab.focused = false;
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

describe('openDesktopApp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('hands the link over in Chrome, and opens nothing else once the app takes the focus', () => {
    const { tab, handOver } = browserTab(CHROME);

    openDesktopApp('codex://launch', 'https://chatgpt.com');
    expect(tab.location.href).toBe('codex://launch');

    handOver();
    vi.advanceTimersByTime(1_000);
    expect(tab.opened).toEqual([]);
  });

  it('opens the web address a second later when no app answers', () => {
    const { tab } = browserTab(CHROME);

    openDesktopApp('codex://launch', 'https://chatgpt.com');
    vi.advanceTimersByTime(999);
    expect(tab.opened).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(tab.opened).toEqual(['https://chatgpt.com']);
  });

  it('tries the link in a hidden frame in Safari, so a missing app shows no error', () => {
    const { tab } = browserTab(SAFARI);

    openDesktopApp('codex://plugins', 'https://chatgpt.com/plugins');
    expect(tab.location.href).toBe('https://www.agentinbox.md/configure');
    expect(tab.frames).toEqual([expect.objectContaining({ hidden: true, src: 'codex://plugins', removed: false })]);

    vi.advanceTimersByTime(1_000);
    expect(tab.opened).toEqual(['https://chatgpt.com/plugins']);
    expect(tab.frames[0]?.removed).toBe(true);
  });
});
