import { afterEach, describe, expect, it, vi } from 'vitest';
import { stubRunningExitAnimation } from '../../testing/fakes';
import { whenExitAnimationEnds } from './presence';

const createElement = () => {
  const element = document.createElement('div');
  document.body.appendChild(element);

  return element;
};

describe('whenExitAnimationEnds', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('is done at once when there is nothing to wait for', () => {
    const done = vi.fn();

    whenExitAnimationEnds(undefined, done);
    whenExitAnimationEnds(document.createElement('div'), done); // detached
    whenExitAnimationEnds(createElement(), done); // no animation, as in jsdom or the `off` motion mode

    expect(done).toHaveBeenCalledTimes(3);
  });

  it('waits for the running exit animation', async () => {
    const element = createElement();
    const animation = stubRunningExitAnimation(element);
    const done = vi.fn();

    whenExitAnimationEnds(element, done);
    await Promise.resolve();
    expect(done).not.toHaveBeenCalled();

    animation.finish();
    await vi.waitFor(() => expect(done).toHaveBeenCalledTimes(1));
  });

  it('is done when the animation is cancelled; the caller decides what that means', async () => {
    const element = createElement();
    const animation = stubRunningExitAnimation(element);
    const done = vi.fn();

    whenExitAnimationEnds(element, done);
    animation.cancel();

    await vi.waitFor(() => expect(done).toHaveBeenCalledTimes(1));
  });

  it('never calls back once cancelled', async () => {
    const element = createElement();
    const animation = stubRunningExitAnimation(element);
    const done = vi.fn();

    const cancel = whenExitAnimationEnds(element, done);
    cancel();
    animation.finish();
    await Promise.resolve();
    await Promise.resolve();

    expect(done).not.toHaveBeenCalled();
  });

  it('gives up after the animation time when the animation never reports back', () => {
    vi.useFakeTimers();
    const element = createElement();
    stubRunningExitAnimation(element, 120);
    const done = vi.fn();

    whenExitAnimationEnds(element, done);
    vi.advanceTimersByTime(169);
    expect(done).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('falls back to the animationend event without getAnimations', () => {
    const element = createElement();
    stubRunningExitAnimation(element);
    delete (element as { getAnimations?: unknown }).getAnimations;
    const done = vi.fn();

    whenExitAnimationEnds(element, done);
    expect(done).not.toHaveBeenCalled();

    element.dispatchEvent(new Event('animationend'));
    expect(done).toHaveBeenCalledTimes(1);
  });
});
