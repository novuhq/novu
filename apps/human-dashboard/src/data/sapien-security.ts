import type { DesignAsset, SectionAssets } from '@/data/sapien-assets';

export const securityAssets = {
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

/** Renders as: accent (orange IvyPresto italic) + rest. */
export const SECURITY_HEADING = {
  accent: 'Secure,',
  rest: 'scalable',
} as const;

/** Novu's meeting booking page; the header links to it too. */
export const BOOK_DEMO_HREF = 'https://cal.com/team/novu/novu-meeting';
export const BOOK_DEMO_LABEL = 'Book a Demo';

/**
 * `lead` is full-strength, then `novu` in the heading's orange, linking to Novu; `lines` are muted and break like
 * this at lg+ (natural wrapping below).
 */
export const SECURITY_CAPTION = {
  lead: 'Agent Inbox is powered by',
  novu: { label: 'Novu', href: 'https://novu.co/' },
  lines: ['the team', 'behind the largest open-source communication', 'infrastructure for agents and products.'],
} as const;

export const SECURITY_BADGES_LABEL = 'Compliance certifications';

export type SecurityBadge = Readonly<{
  id: string;
  alt: string;
  image: DesignAsset;
}>;

/** One row of four cells. */
export const SECURITY_BADGES = [
  { id: 'soc2', alt: 'SOC 2 Type II', image: securityAssets.badgeSoc2 },
  { id: 'iso27001', alt: 'ISO 27001', image: securityAssets.badgeIso27001 },
  { id: 'gdpr', alt: 'GDPR', image: securityAssets.badgeGdpr },
  { id: 'hipaa', alt: 'HIPAA', image: securityAssets.badgeHipaa },
] as const satisfies readonly SecurityBadge[];
