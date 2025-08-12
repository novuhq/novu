import { Resource } from '../../welcome/resources-list';

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

export const WELCOME_MESSAGES = [
  'Good to have you back 👋',
  'Welcome back, superstar! ⭐',
  'Hey there! 🚀',
  'Great to see you again! 🎉',
  'Hello, notification ninja! 🥷',
  'Welcome back, creator! ✨',
  "Look who's back! 🌟",
  'Ready to make some magic happen? 🪄',
  'The notification master returns! 🎯',
  'Welcome aboard, captain! ⚓',
  'Back in action, legend! 💪',
  'Your dashboard awaits, chief! 👑',
  'Let the notifications flow! 🌊',
  'Welcome to your command center! 🎛️',
  'Ready to rock and roll? 🎸',
];

export const HOMEPAGE_SUBTITLE = "Everything's wired up so your subscribers get the right update, right on time.";

export const HELPFUL_RESOURCES: Resource[] = [
  {
    title: 'Documentation',
    image: 'blog.svg',
    url: 'https://docs.novu.co/',
  },
  {
    title: 'Join our community on Discord',
    image: 'discord.svg',
    url: 'https://discord.gg/novu',
  },
  {
    title: 'See our code on GitHub',
    image: 'git.svg',
    url: 'https://github.com/novuhq/novu',
  },
  {
    title: 'Security & Compliance',
    image: 'security.svg',
    url: 'https://trust.novu.co/',
  },
];

export const LEARN_RESOURCES: Resource[] = [
  {
    title: 'Manage Subscribers',
    duration: '4m read',
    image: 'subscribers.svg',
    url: 'https://docs.novu.co/platform/concepts/subscribers?utm_source=novu.co&utm_medium=welcome-page',
  },
  {
    title: 'Topics',
    duration: '5m read',
    image: 'topics.svg',
    url: 'https://docs.novu.co/platform/concepts/topics?utm_source=novu.co&utm_medium=welcome-page',
  },
  {
    title: 'Code First Workflows',
    duration: '4m read',
    image: 'code-first.svg',
    url: 'https://docs.novu.co/framework/introduction?utm_source=novu.co&utm_medium=welcome-page',
  },
  {
    title: 'Digest Engine',
    duration: '3m read',
    image: 'digest engine-1.svg',
    url: 'https://docs.novu.co/platform/workflow/digest?utm_source=novu.co&utm_medium=welcome-page',
  },
];

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
