import { createEffect, createMemo, createSignal, onCleanup, Show } from 'solid-js';
import { whenExitAnimationEnds } from '../../core/motion/presence';
import { MOTION_EASING, readMotionDurationMs } from '../../core/motion/tokens';
import { cn } from '../../helpers';

type Roll = {
  value: string;
  rank: number;
  /** The value it rolls away from; unset for the value shown on mount, which doesn't move. */
  from?: string;
  direction?: 'up' | 'down';
};

type Align = 'start' | 'center';

const ROLLED_CLASS = 'nt-motion-roll nt-whitespace-nowrap';

// The leaving value is out of the flow, so the wrapper is as wide as the new value from the start.
const LEAVING_CLASS: Record<Align, string> = {
  start: 'nt-absolute nt-top-0 nt-start-0',
  center: 'nt-absolute nt-top-0 nt-left-1/2 [translate:-50%_0]',
};

/**
 * Eases the wrapper from the width of the old value to the width of the new one, so what follows it slides over
 * instead of jumping. Only with full motion: the `reduced` mode lets it snap.
 */
const easeWidth = (wrapper: HTMLElement, from: HTMLElement, to: HTMLElement): Animation | undefined => {
  if (typeof wrapper.animate !== 'function' || !wrapper.closest('[data-nv-motion="full"]')) {
    return undefined;
  }
  // Layout widths: a scaling ancestor, such as the Inbox while it opens, must not scale the numbers.
  const start = from.offsetWidth;
  const end = to.offsetWidth;
  const duration = readMotionDurationMs(wrapper, 'slow');
  if (start === end || duration <= 0) {
    return undefined;
  }

  return wrapper.animate([{ width: `${start}px` }, { width: `${end}px` }], {
    duration,
    easing: MOTION_EASING.standard,
  });
};

type RollStepProps = {
  roll: Roll;
  align: Align;
  wrapper: () => HTMLElement | undefined;
};

const RollStep = (props: RollStepProps) => {
  const [leaving, setLeaving] = createSignal<HTMLSpanElement>();
  const [entering, setEntering] = createSignal<HTMLSpanElement>();
  const [hasLeft, setHasLeft] = createSignal(props.roll.from === undefined);

  createEffect(() => {
    const element = leaving();
    const current = entering();
    const wrapper = props.wrapper();
    if (!element) {
      return;
    }
    if (wrapper && current) {
      const width = easeWidth(wrapper, element, current);
      onCleanup(() => width?.cancel());
    }
    onCleanup(whenExitAnimationEnds(element, () => setHasLeft(true)));
  });

  return (
    <>
      <span
        ref={setEntering}
        class={ROLLED_CLASS}
        data-state={props.roll.direction ? 'open' : undefined}
        data-direction={props.roll.direction}
      >
        {props.roll.value}
      </span>
      <Show when={!hasLeft()}>
        <span
          ref={setLeaving}
          aria-hidden="true"
          class={cn(ROLLED_CLASS, LEAVING_CLASS[props.align])}
          data-state="closed"
          data-direction={props.roll.direction}
        >
          {props.roll.from}
        </span>
      </Show>
    </>
  );
};

type RollingTextProps = {
  value: string;
  /** Orders the values: one with a higher rank than the last rolls in from below, a lower one from above. */
  rank: number;
  /** Where the text sits while the width changes: `center` for a count in a badge, `start` for a label. */
  align?: Align;
  class?: string;
};

/**
 * Text that rolls to a new value like an odometer, while the old value leaves the other way and the width eases
 * over. The wrapper clips the values above and below it only; the `reduced` motion mode crossfades them instead.
 */
export const RollingText = (props: RollingTextProps) => {
  const [wrapper, setWrapper] = createSignal<HTMLSpanElement>();
  const align = () => props.align ?? 'center';
  const roll = createMemo<Roll>(
    (previous) =>
      props.value === previous.value
        ? previous
        : {
            value: props.value,
            rank: props.rank,
            from: previous.value,
            direction: props.rank < previous.rank ? 'down' : 'up',
          },
    { value: props.value, rank: props.rank }
  );

  return (
    <span
      ref={setWrapper}
      class={cn(
        'nt-relative nt-inline-flex [clip-path:inset(0_-100vw)]',
        align() === 'center' ? 'nt-justify-center' : 'nt-justify-start',
        props.class
      )}
    >
      <Show when={roll()} keyed>
        {(current) => <RollStep roll={current} align={align()} wrapper={wrapper} />}
      </Show>
    </span>
  );
};
