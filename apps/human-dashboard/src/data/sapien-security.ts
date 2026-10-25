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
} satisfies SectionAssets;

/** Renders as: accent (orange IvyPresto italic) + rest. */
export const SECURITY_HEADING = {
  accent: 'Secure,',
  rest: 'scalable',
} as const;

// TODO: replace with the real agentinbox demo URL
export const BOOK_DEMO_HREF = 'https://novu.co/';
export const BOOK_DEMO_LABEL = 'Book a Demo';

/** `lead` is full-strength; `lines` are muted and break exactly as in Figma at lg+ (natural wrapping below). */
export const SECURITY_CAPTION = {
  lead: 'Agent Inbox is powered by Novu,',
  lines: ['the largest', 'open-source communication infrastructure', 'powering 1.5B messages every month.'],
} as const;

export const SECURITY_BADGES_LABEL = 'Compliance certifications';

export type SecurityBadge = Readonly<{
  id: string;
  alt: string;
  image: DesignAsset;
}>;

/** One row of four cells, in Figma order. */
export const SECURITY_BADGES = [
  { id: 'soc2', alt: 'SOC 2 Type II', image: securityAssets.badgeSoc2 },
  // Figma v4 repeats the SOC 2 Type II badge here (874:10067, identical to
  // 874:10057); kept as designed until design confirms the intended badge.
  { id: 'soc2-repeat', alt: 'SOC 2 Type II', image: securityAssets.badgeSoc2 },
  { id: 'hipaa', alt: 'HIPAA', image: securityAssets.badgeHipaa },
  { id: 'iso27001', alt: 'ISO 27001', image: securityAssets.badgeIso27001 },
] as const satisfies readonly SecurityBadge[];
