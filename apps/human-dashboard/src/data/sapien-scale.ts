import type { DesignAsset, SectionAssets } from '@/data/sapien-assets';
import { SOURCE_URL } from '@/lib/seo';

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
  badgeSoc2: {
    src: '/images/sapien/security/badge-soc2.svg',
    width: 80,
    height: 80,
    nodeId: '874:10058',
    purpose: 'SOC 2 Type II compliance badge (text outlined)',
  },
  badgeHipaa: {
    src: '/images/sapien/security/badge-hipaa.svg',
    width: 94,
    height: 81,
    nodeId: '874:10078',
    purpose: 'HIPAA compliance badge (caduceus)',
  },
  badgeIso27001: {
    src: '/images/sapien/security/badge-iso27001.svg',
    width: 80,
    height: 80,
    nodeId: '874:10081',
    purpose: 'ISO 27001 compliance badge (text outlined)',
  },
  badgeGdpr: {
    src: '/images/sapien/security/badge-gdpr.svg',
    width: 80,
    height: 80,
    nodeId: '',
    purpose: 'GDPR badge: twelve stars around the word (text outlined), drawn to match the other badges',
  },
} satisfies SectionAssets;

export const SCALE_INDEX = '05';
export const SCALE_LABEL = 'Secure and built to scale';

/** Renders as: lead (muted), accent (orange Redaction), inline gauge icon, rest. */
export const SCALE_HEADING = {
  lead: 'Start with one agent.',
  accent: 'Grow to thousands',
  rest: 'securely.',
} as const;

/** Novu's meeting booking page; the header links to it too. */
export const BOOK_DEMO_HREF = 'https://cal.com/team/novu/novu-meeting';
export const BOOK_DEMO_LABEL = 'Book a Demo';

/** `lead`, then `novu` linking to Novu, then `rest`, all one muted line under the heading. */
export const SCALE_CAPTION = {
  lead: 'Agent Inbox is powered by',
  novu: { label: 'Novu', href: 'https://novu.co/' },
  rest: 'the team behind the largest open-source communication infrastructure for agents and products.',
} as const;

// Draft copy — not in Figma. Stars checked against github.com/novuhq/novu (40,229).
export const OPEN_SOURCE = {
  title: 'Open source',
  description: 'MIT licensed. The CLI lives in the Novu repository.',
  stats: [
    { value: '40k+', label: 'GitHub stars' },
    { value: 'Top 0.1%', label: 'of GitHub' },
  ],
  link: 'View the source',
  href: SOURCE_URL,
} as const;

export const SECURITY_BADGES_LABEL = 'Compliance certifications';

export type SecurityBadge = Readonly<{
  id: string;
  alt: string;
  image: DesignAsset;
}>;

export const SECURITY_BADGES = [
  { id: 'soc2', alt: 'SOC 2 Type II', image: scaleAssets.badgeSoc2 },
  { id: 'iso27001', alt: 'ISO 27001', image: scaleAssets.badgeIso27001 },
  { id: 'gdpr', alt: 'GDPR', image: scaleAssets.badgeGdpr },
  { id: 'hipaa', alt: 'HIPAA', image: scaleAssets.badgeHipaa },
] as const satisfies readonly SecurityBadge[];

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
