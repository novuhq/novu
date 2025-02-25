import type { AnimationProps, Variants } from 'motion/react';

export const fadeIn: Pick<AnimationProps, 'initial' | 'animate' | 'exit' | 'transition'> = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3 },
};

export const sectionVariants: Variants = {
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const listVariants: Variants = {
  visible: {
    transition: {
      staggerChildren: 0.03,
    },
  },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 5, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};
