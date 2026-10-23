import type { SectionAssets } from '@/data/sapien-assets';

export const useCasesAssets = {
  imgImageGen1: {
    src: '/images/sapien/use-cases/imgImageGen1.webp',
    width: 1000,
    height: 586,
    nodeId: '724:4519',
    purpose: 'Dithered illustration of a person relaxing with their feet on a desk while working on a laptop',
  },
  imgImageGen: {
    src: '/images/sapien/use-cases/imgImageGen.svg',
    width: 896,
    height: 460,
    nodeId: '724:4518',
    purpose: 'Blurred ellipse (Ellipse 47587) used as the alpha mask that fades the illustration edges',
  },
  imgEllipse47594: {
    src: '/images/sapien/use-cases/imgEllipse47594.svg',
    width: 1122,
    height: 407,
    nodeId: '724:4520',
    purpose: 'Cream ellipse multiplied over the illustration to warm the dither',
  },
  imgLine: {
    src: '/images/sapien/use-cases/imgLine.svg',
    width: 1,
    height: 1920,
    nodeId: '724:4521',
    purpose: 'Vertical dashed guide line through the agent message',
  },
  imgLine1: {
    src: '/images/sapien/use-cases/imgLine1.svg',
    width: 1,
    height: 1920,
    nodeId: '724:4522',
    purpose: 'Horizontal dashed guide line through the agent message (rotated)',
  },
  imgFrame: {
    src: '/images/sapien/use-cases/imgFrame.svg',
    width: 16,
    height: 16,
    nodeId: '724:4525',
    purpose: 'Agent message icon',
  },
  imgFrame1: {
    src: '/images/sapien/use-cases/imgFrame1.svg',
    width: 16,
    height: 16,
    nodeId: '724:4544',
    purpose: 'Human message icon',
  },
  imgCursor: {
    src: '/images/sapien/use-cases/cursor.webp',
    width: 120,
    height: 133,
    nodeId: '874:10859',
    purpose: 'Figma 2x render of the orange cursor beside “Agents” (its progressive blur has no SVG equivalent)',
  },
} satisfies SectionAssets;

export const USE_CASES_SECTION = {
  titleStart: 'Built for',
  titleAccent: 'Agents',
  titleEnd: 'that do real work',
} as const;

export type UseCase = Readonly<{
  title: string;
  description: string;
}>;

export const USE_CASES: readonly UseCase[] = [
  {
    title: 'Browser Agents',
    description:
      'Sign up for services, receive one-time codes, and click verification links without borrowing a human’s email.',
  },
  {
    title: 'Personal Assistants',
    description:
      'Give your Claude, OpenClaw, or Hermes agent its own address so people can email, Slack, or text it directly.',
  },
  {
    title: 'SaaS Agents',
    description:
      'Give every user a way to reach your product’s agent, so actions and questions arrive in one ingestion inbox.',
  },
  {
    title: 'Support agents',
    description:
      'Answer customers on email, Slack, Telegram, and iMessage from one inbox, and keep context when they switch channels.',
  },
];

export const USE_CASES_CONVERSATION = {
  agent: 'Signed up, got the code,\nand answered 12 customers.',
  human: "Nice. I'll keep relaxing.",
} as const;
