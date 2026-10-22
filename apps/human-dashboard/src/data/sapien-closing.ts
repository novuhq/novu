import type { SectionAssets } from '@/data/sapien-assets';

export const closingAssets = {
  angles: {
    src: '/images/sapien/closing/imgAngles.svg',
    width: 434,
    height: 500,
    nodeId: '874:8490',
    purpose:
      'Desktop corner brackets (432×498 frame, 32px corners) around the Agent ID card; drawn 0.5px into a 1px larger canvas so the centred strokes stay half-pixel at 1x',
  },
  anglesMobile: {
    src: '/images/sapien/closing/angles-mobile.svg',
    width: 322,
    height: 398,
    nodeId: '895:2158',
    purpose:
      'Mobile corner brackets (320×396 frame, 24px corners) around the Agent ID card; same half-pixel canvas as the desktop brackets',
  },
  cardMask: {
    src: '/images/sapien/closing/card-mask.svg',
    width: 810.309,
    height: 595.307,
    nodeId: '874:8496',
    purpose: 'Blurred ellipse alpha mask that fades the Agent ID card (575×360 ellipse plus its blur bleed)',
  },
  robotArm: {
    src: '/images/sapien/closing/robot-arm.webp',
    width: 1180,
    height: 838,
    nodeId: '874:8528',
    purpose:
      'Orange-tinted dithered robot arm over the card (Figma 2x render incl. its feathered mask, shown at 590×419)',
  },
} satisfies SectionAssets;

export const CLOSING_HEADING = {
  lead: 'Give your agent',
  rest: 'an Inbox.',
  accent: 'Today',
} as const;

export const CLOSING_DESCRIPTION = ['Free for 100 conversations a month.', 'No credit card required.'] as const;

export const CLOSING_COMMAND = 'npx @agentinbox/cli setup';
export const CLOSING_COMMAND_LABEL = 'Closing setup command';

export const CLOSING_PROMPT_LABEL = 'Copy Prompt';
// Draft copy — not in Figma. An agent has no terminal to answer setup's questions, so it asks first.
export const CLOSING_PROMPT =
  'Set up an agentinbox inbox for yourself: ask me for my name and email, run `npx @agentinbox/cli setup --name "<my name>" --email <my email>`, then tell me your new address.';
// Draft copy — not in Figma
export const CLOSING_PROMPT_SUCCESS_MESSAGE = 'Prompt copied to clipboard';
