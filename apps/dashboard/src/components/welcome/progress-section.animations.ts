export const mainCard = {
  hidden: { opacity: 0, scale: 0.98 },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1],
      when: 'beforeChildren',
    },
  },
};

export const leftSection = {
  hidden: { opacity: 0, x: -10 },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
      staggerChildren: 0.1,
    },
  },
};

export const textItem = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
};

export const stepsList = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.2,
      ease: 'easeOut',
    },
  },
};

export const stepItem = {
  hidden: {
    opacity: 0,
    y: 10,
    scale: 0.98,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.21, 1.02, 0.73, 0.99], // subtle bounce
    },
  },
};

export const logo = {
  hidden: { opacity: 0 },
  show: {
    opacity: 0.5,
    transition: {
      delay: 0.4,
      duration: 0.6,
    },
  },
};
