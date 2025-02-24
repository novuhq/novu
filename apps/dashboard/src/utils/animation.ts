import { AnimationProps } from 'motion/react';

export const fadeIn: Pick<AnimationProps, 'initial' | 'animate' | 'exit' | 'transition'> = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3 },
};
