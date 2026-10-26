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
    purpose: 'Two-way messaging feature icon (chat bubble)',
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
  // The Scale section's icons, in the same pixel style.
  imgThreads: {
    src: '/images/sapien/scale/imgFrame1.svg',
    width: 24,
    height: 24,
    nodeId: '724:4405',
    purpose: 'Thread and replies feature icon (grid with a plus), shared with the Scale section',
  },
  imgPersistent: {
    src: '/images/sapien/scale/imgFrame2.svg',
    width: 24,
    height: 24,
    nodeId: '724:4426',
    purpose: 'Persistent conversations feature icon (document), shared with the Scale section',
  },
  imgContactCard: {
    src: '/images/sapien/scale/imgFrame.svg',
    width: 24,
    height: 24,
    nodeId: '724:4378',
    purpose: 'Shareable contact card feature icon (globe), shared with the Scale section',
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
 * `$ agentinbox inbox send \`, then the question (`ask`, `approve`, `choose`, or none for a plain
 * message) as the CLI takes it, then its flags, a line each so the command fits the terminal.
 */
function command(
  question: string | readonly string[],
  flagLines: readonly (readonly Flag[])[]
): readonly TerminalLine[] {
  return [
    [
      { text: '$', tone: 'accent' },
      { text: ' ' },
      { text: 'agentinbox inbox send', tone: 'muted' },
      { text: ' ' },
      CONTINUED,
    ],
    ...(typeof question === 'string' ? [question] : question).map(
      (part): TerminalLine => [{ text: `    ${part} ` }, CONTINUED]
    ),
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
 * The line every send prints first (on stderr, `formatConversationReport` in `packages/agentinbox`): the
 * conversation it landed in.
 */
export const SEND_REPORT: TerminalLine = [{ text: 'conversation: conv_123' }];

/**
 * What the CLI prints once the question is settled (`describeInteraction` in `packages/agentinbox`): the
 * outcome in orange, the person and the answer bright. "by" names the person as the API records them, by
 * first name; "Delivered to" lists the `--to` contact ids.
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
  /** Supporting copy: what the message type is for, above its command. */
  description: string;
  command: readonly TerminalLine[];
  result: TerminalLine;
  card: NotificationCard;
}>;

export const BUILDING_BLOCKS_DEFAULT_TAB: BuildingBlockExample['id'] = 'approve';

// Draft copy — not in Figma. One deploy story across the four tabs.
export const BUILDING_BLOCK_EXAMPLES: readonly BuildingBlockExample[] = [
  {
    id: 'ask',
    label: 'Ask',
    description: 'Get a written answer when your agent needs more information.',
    command: command(
      ['ask', '"Which environment should I deploy to?"'],
      [
        [
          ['--to', 'maya'],
          ['--ttl', '1d'],
        ],
      ]
    ),
    result: result('Answered', ' by ', ['Maya'], ' at ', ['14:02:11'], ': ', ['staging']),
    card: {
      author: 'ops-agent',
      time: 'just now',
      message: 'Which environment should I deploy to?',
      response: { kind: 'reply', value: 'staging', action: 'Reply' },
    },
  },
  {
    id: 'approve',
    label: 'Approve',
    description: 'Request approval before the agent takes the next step.',
    command: command('approve "Deploy the fix to staging?"', [
      [
        ['--to', 'maya'],
        ['--ttl', '2h'],
      ],
    ]),
    result: result('Approved', ' by ', ['Maya'], ' at ', ['14:02:11'], '.'),
    card: {
      author: 'ops-agent',
      time: 'just now',
      message: 'Deploy the fix to staging?',
      response: {
        kind: 'buttons',
        buttons: [{ label: 'Approve', primary: true }, { label: 'Deny' }],
      },
    },
  },
  {
    id: 'choose',
    label: 'Choose',
    description: 'Let a person select from the options your agent provides.',
    command: command(
      ['choose', '"Which release strategy should I use?"'],
      [
        [
          ['--option', 'Canary'],
          ['--option', 'Blue-green'],
        ],
        [
          ['--option', 'Rolling'],
          ['--to', 'maya'],
        ],
      ]
    ),
    result: result('Chose', ' ', ['"Canary"'], ' by ', ['Maya'], ' at ', ['14:02:11'], '.'),
    card: {
      author: 'ops-agent',
      time: 'just now',
      message: 'Which release strategy should I use?',
      response: {
        kind: 'buttons',
        buttons: [{ label: 'Canary', primary: true }, { label: 'Blue-green' }, { label: 'Rolling' }],
      },
    },
  },
  {
    id: 'tell',
    label: 'Tell',
    description: 'Send an update without waiting for a response.',
    // A plain message: `send` with no question, which doesn't wait.
    command: command('"The staging checks passed."', [[['--to', 'maya']]]),
    result: result('Delivered', ' to ', ['maya'], ' on ', ['slack'], '.'),
    card: {
      author: 'ops-agent',
      time: 'just now',
      message: 'The staging checks passed.',
      response: { kind: 'note', text: 'No reply needed' },
    },
  },
];

export type BuildingBlockFeature = Readonly<{
  title: string;
  description: string;
  icon: DesignAsset;
}>;

// Attachments are out until they can be verified.
export const BUILDING_BLOCK_FEATURES: readonly BuildingBlockFeature[] = [
  {
    title: 'Two-way messaging.',
    description: 'People can write to your agent first. It can read the message and reply in the same conversation.',
    icon: buildingBlocksAssets.imgFrame1,
  },
  {
    title: 'Thread and replies.',
    description: 'Reply in the right thread with full context, on any channel, through one API.',
    icon: buildingBlocksAssets.imgThreads,
  },
  {
    title: 'Persistent conversations.',
    description:
      'Keep the exchange available across agent runs, so your agent can return to earlier messages and replies.',
    icon: buildingBlocksAssets.imgPersistent,
  },
  {
    title: 'Conversation History.',
    description: 'Every message across every channel, merged into one timeline your agent can read.',
    icon: buildingBlocksAssets.imgFrame4,
  },
  {
    title: 'Contacts.',
    description: 'Invite the people your agent works with and reach them on their connected channels.',
    icon: buildingBlocksAssets.imgFrame3,
  },
  {
    title: 'Shareable contact card.',
    description: "Give people one place to find your agent's available email and chat identities.",
    icon: buildingBlocksAssets.imgContactCard,
  },
  {
    title: 'Reactions.',
    description: 'Read emoji reactions as signals and react back, so a thumbs-up can count as a reply.',
    icon: buildingBlocksAssets.imgFrame,
  },
];
