import type { DesignAsset, SectionAssets } from '@/data/sapien-assets';

export const scaleAssets = {
  grid: {
    src: '/images/sapien/scale/grid.webp',
    width: 958,
    height: 518,
    nodeId: '724:4368',
    purpose: 'Decorative radiating perspective grid behind the statement (rendered layer export, rotation applied)',
  },
  imgIcon: {
    src: '/images/sapien/scale/imgIcon.svg',
    width: 40,
    height: 40,
    nodeId: '724:4371',
    purpose: 'Decorative inline gauge icon inside the statement',
  },
  imgFrame: {
    src: '/images/sapien/scale/imgFrame.svg',
    width: 24,
    height: 24,
    nodeId: '724:4378',
    purpose: 'Custom domains feature icon',
  },
  imgFrame1: {
    src: '/images/sapien/scale/imgFrame1.svg',
    width: 24,
    height: 24,
    nodeId: '724:4405',
    purpose: 'Owner control feature icon',
  },
  imgFrame2: {
    src: '/images/sapien/scale/imgFrame2.svg',
    width: 24,
    height: 24,
    nodeId: '724:4426',
    purpose: 'Activity history feature icon',
  },
} satisfies SectionAssets;

export const SCALE_LABEL = 'Built to scale';

/** Renders as: lead, accent (orange), inline gauge icon, rest. */
export const SCALE_HEADING = {
  lead: 'Start today with one agent.',
  accent: 'Grow to thousands',
  rest: 'with confidence.',
} as const;

export type ScaleFeature = Readonly<{
  title: string;
  description: string;
  icon: DesignAsset;
}>;

export const SCALE_FEATURES = [
  {
    title: 'Owner control.',
    description: 'See every conversation and decision, set who can reach your agent, and pause it anytime.',
    icon: scaleAssets.imgFrame1,
  },
  {
    title: 'Activity history.',
    description: 'Search every conversation by channel and state.',
    icon: scaleAssets.imgFrame2,
  },
  {
    title: 'Custom domains.',
    description: 'Send from your own subdomain and keep your original address.',
    icon: scaleAssets.imgFrame,
  },
] as const satisfies readonly ScaleFeature[];
