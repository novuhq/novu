import type { JSX } from 'solid-js';
import { Motion as MotionPrimitive, MotionProxy, MotionProxyComponent, type Options } from 'solid-motionone';
import { useAppearance } from '../../context';
import type { MotionMode } from '../../core/motion/mode';

const INSTANT = { duration: 0 };

/** The values that move or resize; `reduced` motion snaps them and keeps opacity (and colour) fades. */
const MOVING_VALUES = [
  'x',
  'y',
  'scale',
  'rotate',
  'width',
  'height',
  'marginLeft',
  'marginBottom',
  'borderWidth',
  'borderRadius',
] as const;

const REDUCED_OVERRIDES = Object.fromEntries(MOVING_VALUES.map((value) => [value, INSTANT]));

export const gateTransition = (mode: MotionMode, transition: Options['transition']): Options['transition'] => {
  if (mode === 'off') {
    return INSTANT;
  }
  if (mode === 'reduced') {
    return { ...transition, ...REDUCED_OVERRIDES };
  }

  return transition;
};

export const Motion = new Proxy(MotionPrimitive, {
  get:
    (_, tag: keyof JSX.IntrinsicElements): MotionProxyComponent<JSX.IntrinsicElements[keyof JSX.IntrinsicElements]> =>
    (props) => {
      const { motionMode } = useAppearance();

      return <MotionPrimitive {...props} tag={tag} transition={gateTransition(motionMode(), props.transition)} />;
    },
}) as MotionProxy;
