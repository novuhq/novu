export const ANIMATION_VARIANTS = {
  page: {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  },
  section: {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  },
};

export const CHART_CONFIG = {
  reportTypes: [
    'DELIVERY_TREND',
    'INTERACTION_TREND',
    'WORKFLOW_BY_VOLUME',
    'PROVIDER_BY_VOLUME',
    'MESSAGES_DELIVERED',
    'ACTIVE_SUBSCRIBERS',
    'AVG_MESSAGES_PER_SUBSCRIBER',
    'WORKFLOW_RUNS_METRIC',
    'TOTAL_INTERACTIONS',
    'WORKFLOW_RUNS_TREND',
    'ACTIVE_SUBSCRIBERS_TREND',
  ] as const,
  refetchInterval: 5 * 60 * 1000, // 5 minutes
  staleTime: 2 * 60 * 1000, // 2 minutes
};
