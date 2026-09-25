import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createControlledAnimation, installAnimateSpy } from '../../testing/fakes';
import { RollingText } from './RollingText';

/** Makes every element with `data-state="closed"` report a running CSS exit animation. */
const stubRunningExits = () => {
  const exit = createControlledAnimation();
  const getComputedStyle = window.getComputedStyle;
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) =>
    element instanceof HTMLElement && element.dataset.state === 'closed'
      ? ({
          display: 'inline',
          animationName: 'nv-exit',
          animationDuration: '0.22s',
          animationDelay: '0s',
          animationIterationCount: '1',
        } as CSSStyleDeclaration)
      : getComputedStyle(element)
  );
  const prototype = Element.prototype as { getAnimations?: () => Animation[] };
  prototype.getAnimations = function getAnimations(this: Element) {
    return this instanceof HTMLElement && this.dataset.state === 'closed' && exit.playState === 'running' ? [exit] : [];
  };

  return {
    exit,
    restore: () => {
      vi.restoreAllMocks();
      delete prototype.getAnimations;
    },
  };
};

describe('RollingText', () => {
  let restore: (() => void) | undefined;

  afterEach(() => {
    restore?.();
    restore = undefined;
    document.body.innerHTML = '';
  });

  const setup = (value: string, rank: number) => {
    const [text, setText] = createSignal({ value, rank });
    const container = document.createElement('div');
    container.dataset.nvMotion = 'full';
    document.body.appendChild(container);
    const dispose = render(() => <RollingText value={text().value} rank={text().rank} />, container);
    const values = () =>
      [...container.querySelectorAll<HTMLElement>('.nt-motion-roll')].map((element) => ({
        text: element.textContent,
        state: element.dataset.state,
        direction: element.dataset.direction,
      }));

    return { container, setText, values, dispose };
  };

  it('shows the first value without motion', () => {
    const { values, dispose } = setup('3', 3);

    expect(values()).toEqual([{ text: '3', state: undefined, direction: undefined }]);
    dispose();
  });

  it('rolls up to a higher rank and down to a lower one, dropping the old value when nothing animates', () => {
    const { setText, values, dispose } = setup('3', 3);

    setText({ value: '4', rank: 4 });
    expect(values()).toEqual([{ text: '4', state: 'open', direction: 'up' }]);

    setText({ value: '2', rank: 2 });
    expect(values()).toEqual([{ text: '2', state: 'open', direction: 'down' }]);
    dispose();
  });

  it('keeps the old value until its exit animation ends', async () => {
    const running = stubRunningExits();
    restore = running.restore;
    const { setText, values, dispose } = setup('Inbox', 0);

    setText({ value: 'Unread', rank: 1 });
    expect(values()).toEqual([
      { text: 'Unread', state: 'open', direction: 'up' },
      { text: 'Inbox', state: 'closed', direction: 'up' },
    ]);

    running.exit.finish();
    await vi.waitFor(() => expect(values()).toEqual([{ text: 'Unread', state: 'open', direction: 'up' }]));
    dispose();
  });

  it('eases the width from the old value to the new one, keeping the old one out of the flow', () => {
    const running = stubRunningExits();
    const animations = installAnimateSpy();
    // jsdom lays nothing out: make a value as wide as its digits.
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return (this.textContent ?? '').length * 8;
    });
    restore = () => {
      animations.restore();
      running.restore();
    };
    const { container, setText, dispose } = setup('9', 9);

    setText({ value: '10', rank: 10 });
    const leaving = container.querySelector<HTMLElement>('[data-state="closed"]');
    expect(leaving?.className).toContain('nt-absolute');
    expect(animations.calls.map((call) => call.keyframes)).toEqual([[{ width: '8px' }, { width: '16px' }]]);
    dispose();
  });
});
