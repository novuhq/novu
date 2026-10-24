import type { DesignAsset, SectionAssets } from '@/data/sapien-assets';

export const buildingBlocksAssets = {
  texture: {
    src: '/images/sapien/building-blocks/texture-render.webp',
    width: 1606,
    height: 986,
    nodeId: '724:4882',
    purpose: 'Figma 2x render of the dithered particle texture behind the notification card (mix-blend-difference)',
  },
  imgFrame: {
    src: '/images/sapien/building-blocks/imgFrame.svg',
    width: 24,
    height: 24,
    nodeId: '724:4930',
    purpose: 'Reactions feature icon (thumbs-up)',
  },
  imgFrame1: {
    src: '/images/sapien/building-blocks/imgFrame1.svg',
    width: 24,
    height: 24,
    nodeId: '724:4942',
    purpose: 'Thread and replies feature icon (chat bubble)',
  },
  imgFrame2: {
    src: '/images/sapien/building-blocks/imgFrame2.svg',
    width: 24,
    height: 24,
    nodeId: '724:4957',
    purpose: 'Attachments feature icon (paperclip)',
  },
  imgFrame3: {
    src: '/images/sapien/building-blocks/imgFrame3.svg',
    width: 24,
    height: 24,
    nodeId: '724:4974',
    purpose: 'Contacts feature icon (people)',
  },
  imgFrame4: {
    src: '/images/sapien/building-blocks/imgFrame4.svg',
    width: 24,
    height: 24,
    nodeId: '724:6863',
    purpose: 'Conversation History feature icon (watch)',
  },
} satisfies SectionAssets;

export const BUILDING_BLOCKS_HEADING = {
  /** Rendered on two lines, in this order. */
  lead: ['The agent', 'communication'],
  accent: 'building blocks',
} as const;

/** Figma breaks the caption onto these three lines (applied from `lg` up). */
export const BUILDING_BLOCKS_DESCRIPTION = [
  'Free-form messages leave agents guessing.',
  'Agent Inbox turns every human conversation into',
  'a structured response your agent can trust.',
] as const;

// Draft copy — not in Figma (accessible name of the tab list)
export const BUILDING_BLOCKS_TABS_LABEL = 'Message types';

/** `muted` = text-50, `accent` = orange, `bright` = text-100. Unset inherits the line colour. */
export type TerminalTone = 'muted' | 'accent' | 'bright';
export type TerminalToken = Readonly<{ text: string; tone?: TerminalTone }>;
export type TerminalLine = readonly TerminalToken[];

type Flag = readonly [flag: string, value: string];

/** A line continued on the next one: the shell's `\`. */
const CONTINUED: TerminalToken = { text: '\\', tone: 'muted' };

/**
 * `$ npx @agentinbox/cli inbox send \`, then the question (`ask`, `approve`, `choose`, or none for a plain
 * message) as the CLI takes it, then its flags, a line each so the command fits the terminal.
 */
function command(question: string, flagLines: readonly (readonly Flag[])[]): readonly TerminalLine[] {
  return [
    [
      { text: '$', tone: 'accent' },
      { text: ' ' },
      { text: 'npx @agentinbox/cli inbox send', tone: 'muted' },
      { text: ' ' },
      CONTINUED,
    ],
    [{ text: `    ${question} ` }, CONTINUED],
    ...flagLines.map(
      (flags, index): TerminalLine => [
        { text: '   ' },
        ...flags.flatMap(([flag, value]): TerminalToken[] => [
          { text: ' ' },
          { text: flag, tone: 'muted' },
          { text: ` ${value}` },
        ]),
        ...(index < flagLines.length - 1 ? [{ text: ' ' }, CONTINUED] : []),
      ]
    ),
  ];
}

/**
 * What the CLI prints once the question is settled (`describeInteraction` in `packages/agentinbox`): the
 * outcome in orange, the person and the answer bright.
 */
function result(outcome: string, ...rest: readonly (string | readonly [bright: string])[]): TerminalLine {
  return [
    { text: outcome, tone: 'accent' },
    ...rest.map(
      (part): TerminalToken => (typeof part === 'string' ? { text: part } : { text: part[0], tone: 'bright' })
    ),
  ];
}

export type NotificationButton = Readonly<{
  label: string;
  /** Rendered as the light "primary" button. */
  primary?: boolean;
}>;

export type NotificationResponse =
  | Readonly<{ kind: 'buttons'; buttons: readonly NotificationButton[] }>
  | Readonly<{ kind: 'reply'; value: string; action: string }>
  | Readonly<{ kind: 'note'; text: string }>;

export type NotificationCard = Readonly<{
  author: string;
  time: string;
  message: string;
  response: NotificationResponse;
}>;

export type BuildingBlockExample = Readonly<{
  id: 'ask' | 'approve' | 'choose' | 'tell';
  label: string;
  command: readonly TerminalLine[];
  result: TerminalLine;
  card: NotificationCard;
}>;

export const BUILDING_BLOCKS_DEFAULT_TAB: BuildingBlockExample['id'] = 'approve';

export const BUILDING_BLOCK_EXAMPLES: readonly BuildingBlockExample[] = [
  {
    id: 'ask',
    label: 'Ask',
    // Draft copy — not in Figma
    command: command('ask "Where should I ship the order?"', [
      [
        ['--to', 'maya'],
        ['--ttl', '1d'],
      ],
    ]),
    // Draft copy — not in Figma
    result: result('Answered', ' by ', ['maya'], ' at ', ['14:02:11'], ': ', ['Berlin office']),
    // Draft copy — not in Figma
    card: {
      author: 'ops-agent',
      time: 'just now',
      message: 'Where should I ship the order?',
      response: { kind: 'reply', value: 'Berlin office', action: 'Reply' },
    },
  },
  {
    id: 'approve',
    label: 'Approve',
    // Single quotes: in double ones the shell would read `$2` as a variable.
    command: command("approve 'Refund $240 to Acme Corp?'", [
      [
        ['--to', 'maya'],
        ['--ttl', '2h'],
      ],
    ]),
    result: result('Approved', ' by ', ['maya'], ' at ', ['14:02:11'], '.'),
    card: {
      author: 'ops-agent',
      time: 'just now',
      message: 'Refund $240 to Acme Corp?',
      response: {
        kind: 'buttons',
        buttons: [{ label: 'Approve', primary: true }, { label: 'Deny' }],
      },
    },
  },
  {
    id: 'choose',
    label: 'Choose',
    // Draft copy — not in Figma
    command: command('choose "How should I resolve Acme?"', [
      [
        ['--option', 'Refund'],
        ['--option', 'Credit'],
      ],
      [
        ['--option', 'Replace'],
        ['--to', 'maya'],
      ],
    ]),
    // Draft copy — not in Figma
    result: result('Chose', ' ', ['"Credit"'], ' by ', ['maya'], ' at ', ['14:02:11'], '.'),
    // Draft copy — not in Figma
    card: {
      author: 'ops-agent',
      time: 'just now',
      message: 'How should I resolve Acme?',
      response: {
        kind: 'buttons',
        buttons: [{ label: 'Refund' }, { label: 'Credit', primary: true }, { label: 'Replace' }],
      },
    },
  },
  {
    id: 'tell',
    label: 'Tell',
    // Draft copy — not in Figma
    // A plain message: `send` with no question, which doesn't wait.
    command: command('"Refund sent to Acme Corp"', [[['--to', 'maya']]]),
    // Draft copy — not in Figma
    result: result('Delivered', ' to ', ['maya'], ' on ', ['slack'], '.'),
    // Draft copy — not in Figma
    card: {
      author: 'ops-agent',
      time: 'just now',
      message: 'Refund sent to Acme Corp',
      response: { kind: 'note', text: 'No reply needed' },
    },
  },
];

export type BuildingBlockFeature = Readonly<{
  title: string;
  description: string;
  icon: DesignAsset;
}>;

export const BUILDING_BLOCK_FEATURES: readonly BuildingBlockFeature[] = [
  {
    title: 'Reactions.',
    description: 'Read emoji reactions as signals and react back, so a thumbs-up can count as a reply.',
    icon: buildingBlocksAssets.imgFrame,
  },
  {
    title: 'Thread and replies.',
    description: 'Reply in the right thread with full context, on any channel, through one API.',
    icon: buildingBlocksAssets.imgFrame1,
  },
  {
    title: 'Attachments.',
    // Figma joins these word pairs with a non-wrapping "\r", so they move to the next line together.
    description:
      'Send and receive\u00a0files, images, and documents\u00a0on any channel your agent is\u00a0connected to.',
    icon: buildingBlocksAssets.imgFrame2,
  },
  {
    title: 'Contacts.',
    description: 'Reach each person on the channel they prefer, with one identity across Slack, email, and chat.',
    icon: buildingBlocksAssets.imgFrame3,
  },
  {
    title: 'Conversation History.',
    description: 'Every message across every channel, merged into one timeline your agent can read.',
    icon: buildingBlocksAssets.imgFrame4,
  },
];
