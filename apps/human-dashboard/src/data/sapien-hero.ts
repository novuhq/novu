import type { SectionAssets } from '@/data/sapien-assets';

export const heroAssets = {
  light: {
    src: '/images/sapien/hero/light.svg',
    width: 1049,
    height: 667,
    nodeId: '874:10702',
    purpose: 'Blurred warm glow behind the card stack (785×403 ellipse plus its blur bleed)',
  },
  stackMask: {
    src: '/images/sapien/hero/stack-mask.svg',
    width: 810.307,
    height: 580.307,
    nodeId: '874:10704',
    purpose: 'Blurred ellipse alpha mask that fades the card stack (575×345 ellipse plus its blur bleed)',
  },
  robotArms: {
    src: '/images/sapien/hero/robot-arms.webp',
    width: 1820,
    height: 864,
    nodeId: '874:10754',
    purpose: 'Static dithered robot arms holding the card stack (Figma 2x render, shown at 910×432)',
  },
  opsAgentAvatar: {
    src: '/images/sapien/hero/ops-agent-avatar.webp',
    width: 88,
    height: 88,
    nodeId: '874:10713',
    purpose: 'Dithered sphere avatar on the business card (2x, shown at 44×44)',
  },
  agentIdAvatar: {
    src: '/images/sapien/hero/agent-id-avatar.webp',
    width: 192,
    height: 350,
    nodeId: '874:5700',
    purpose: 'Dithered portrait on the Agent ID card (2x, shown at 96×175)',
  },
  salesAgentAvatar: {
    src: '/images/sapien/hero/sales-agent-avatar.webp',
    width: 120,
    height: 120,
    nodeId: '874:5762',
    purpose: 'Dithered sphere avatar on the call card (2x, shown at 60×60)',
  },
  salesAgentPhone: {
    src: '/images/sapien/hero/sales-agent-phone.webp',
    width: 379,
    height: 85,
    nodeId: '874:5780',
    purpose: 'Noise-dissolved caller number on the call card (2x render of the text effect, shown at 189.5×42.5)',
  },
  callWaveform: {
    src: '/images/sapien/hero/call-waveform.svg',
    width: 261,
    height: 60,
    nodeId: '874:5731',
    purpose: 'Voice waveform panel on the call card',
  },
  checkIcon: {
    src: '/images/sapien/hero/check-icon.svg',
    width: 20,
    height: 20,
    nodeId: '874:10730',
    purpose: 'Hand-drawn verified tick on the business card rows',
  },
} satisfies SectionAssets;

export const HERO_TITLE = {
  lead: 'The',
  highlight: 'E-mail',
  rest: 'inbox',
  accent: 'for AI agents',
} as const;

/** Channels the title's pill cycles through, starting with the Figma state. */
export const HERO_TITLE_WORDS = [HERO_TITLE.highlight, 'Telegram', 'Slack'] as const;

/** Each title word stays in the pill for this long before the next one swaps in. */
export const HERO_WORD_INTERVAL = 3000;

export const HERO_DESCRIPTION = [
  'A dedicated inbox for each agent, so it can start conversations,',
  'handle replies, get emails, and keep context across every thread.',
] as const;

export const HERO_COMMAND_LABEL = 'Hero setup command';

export const HERO_FIGURE_LABEL = 'Example agent identity cards';
// Draft copy — not in Figma
export const HERO_FIGURE_DESCRIPTION =
  'Three example cards rotate in a stack held by two robot arms: a business card for ops-agent with a verified email address, phone number, Telegram and Slack handle; an Agent ID for atlas-northwind, a personal assistant working for Maya Chen; and sales-agent on a call with a customer.';
export const HERO_FIGURE_CAPTION = 'fig. 01';
export const HERO_FIGURE_STATE = { playing: 'dithering', paused: 'paused' };

/** Each card stays in front for this long before the next one replaces it. */
export const HERO_CARD_INTERVAL = 6000;

export type HeroRelation = Readonly<{ verb: string; object: string }>;

export const HERO_RELATIONS = [
  { verb: 'presents', object: 'identity' },
  { verb: 'works for', object: 'human' },
  { verb: 'calls', object: 'customer' },
] as const satisfies readonly HeroRelation[];

export const BUSINESS_CARD = {
  title: 'Business Card',
  status: 'Online',
  name: 'ops-agent',
  role: 'AI agent · Ops',
  rows: [
    // Figma's trailing "\r" renders as a non-breaking space before the tick.
    { label: 'Email', value: 'ops-agent@agentinbox.md ' },
    { label: 'Phone', value: '+1 (415) 555-0142' },
    { label: 'Telegram', value: '@ops_agent' },
    { label: 'Slack', value: '@ops_agent' },
  ],
  mrz: ['AGENT<<OPS<AGENT<<<<<<<<<<<<<<<<<<<<<<', 'AGENTINBOX<MD<<14155550142<<<<<<<<<<<<'],
} as const;

export const AGENT_ID_CARD = {
  title: 'Agent ID',
  number: 'No. 0427',
  fields: [
    { label: 'Name', value: 'atlas-northwind' },
    { label: 'Role', value: 'Personal assistant' },
    { label: 'Works for', value: 'Maya Chen' },
  ],
  channels: ['email', 'imessage', 'slack'],
  mrz: ['AGENT<<ATLAS<<<<<<<<<<<<<<<<<<<<<<<<<<<', 'AGENTINBOX<MD<<PA<<0427<<<<<<<<<<<<<'],
} as const;

export const CALL_CARD = {
  title: 'sales-agent',
  status: 'Online',
  callState: 'ON CALL · 00:42',
  phone: '+1 (415) 555-0199',
  // Figma's trailing "\r" renders as a non-breaking space at the line end.
  quote: [
    { text: '“Hi, it’s the sales agent from Acme. ', muted: true },
    { text: 'You asked for a demo — does ', muted: true },
    { text: 'Thursday at 3 pm work?”', muted: false },
  ],
  mrz: ['AGENT<<SALES<AGENT<<<<<<<<<<<<<<<<<<<<<<', 'AGENTINBOX<MD<<14155550199<<<<<<<<<<<<<<'],
} as const;
