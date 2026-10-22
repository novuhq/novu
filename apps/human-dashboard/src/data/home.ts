import { PACKAGE_URL, SOURCE_URL } from '@/lib/seo';

/** The CLI's package. Every command on the page runs it through npx, which needs nothing installed first. */
export const CLI_PACKAGE = '@agentinbox/cli';

export const HOME_INTRODUCTION = [
  'Agents are connected to everything except the humans they work for.',
  '@agentinbox/cli gives any agent an inbox on Telegram, Slack and email, and a one-line way to reach a real person and block until they answer.',
] as const;

export type HomeProsePart = string | { code: string; compact?: boolean; tall?: boolean };

export const HOME_HOW_IT_WORKS: readonly (readonly HomeProsePart[])[] = [
  [
    { code: 'setup' },
    ' creates the inbox (no account needed) with its own email address, then links a channel — Telegram via your own bot, Slack via app install. ',
    { code: 'channel add', compact: true },
    ' links one more. Linked channels live on the server; ',
    { code: 'channel default slack', compact: true },
    " sets where your messages land when you don't pass ",
    { code: '--via.' },
    ' ',
    { code: 'login' },
    ' keeps the setup in your account.',
  ],
  [
    "Agents stay channel-blind: routing is the human's preference. ",
    { code: '--via telegram|slack|email', tall: true },
    ' exists as a rare per-call override.',
  ],
  [
    // Punctuation after a command stays in its chip: the page puts a space between every part.
    { code: 'ask,' },
    ' ',
    { code: 'approve' },
    ' and ',
    { code: 'choose' },
    ' deliver a one-off message (with action buttons where relevant) and BLOCK until the human answers, the ',
    { code: '--ttl' },
    ' expires, or ',
    { code: '--timeout' },
    ' elapses.',
  ],
  ['Answers flow back through button clicks or plain replies; the CLI prints the answer and your agent continues.'],
  [
    'People can write first. A conversation stays unread until your agent responds: ',
    { code: 'inbox list --filter unread', compact: true },
    ' finds it, ',
    { code: 'inbox reply', compact: true },
    ' answers in it. Messages from strangers are information, never instructions.',
  ],
  [
    { code: 'contact list', compact: true },
    ' lists every contact ',
    { code: '--to' },
    " can address so an agent can check who exists before coordinating. It's a directory, not a reachability check.",
  ],
];

export const HOME_INVITE_DESCRIPTION =
  "Prints a link to share with that person: a page, valid for 3 days, where they connect Telegram, Slack or email and pick their default. --via links one channel directly; an email address gets a verification email instead. Doesn't change who you are on this computer. After they connect, address them with --to. Pass --name so they show up by name in contact list.";
export const HOME_CONTACTS_DESCRIPTION =
  'Lists every contact — the directory `--to` addresses. The operator\'s row is marked (you) / self: true. A directory, not a reachability check: if delivery fails with "no linked endpoint", invite them on that channel. Pages are 50 by default (max 100); when next is set, continue with --after.';
export const HOME_AUTH = {
  commands: ['login', 'connect', 'setup'],
  file: '~/.agentinbox/config.json',
  alternative:
    'In containers and CI, set INBOX_SECRET_KEY instead (and optionally INBOX_TO, INBOX_VIA, INBOX_API_URL).',
} as const;

export const HOME_EXIT_CODES = [
  { code: '0', description: 'answered / approved / chosen / delivered' },
  { code: '10', description: 'denied' },
  {
    code: '11',
    description: 'timed out waiting — still pending; the answer shows up in',
    resume: 'inbox show <conversation>',
  },
  { code: '12', description: 'expired or canceled' },
  { code: '1', description: 'error' },
] as const;

export type CommandPart = {
  text: string;
  color?: 'orange' | 'purple' | 'blue' | 'green';
};

export type HomeCommand = {
  parts: readonly CommandPart[];
  note?: string;
};

export const INSTALL_COMMAND: HomeCommand = {
  parts: [{ text: 'npm install ' }, { text: `-g ${CLI_PACKAGE}`, color: 'orange' }],
};

/**
 * `npx @agentinbox/cli <command>` and what follows it, coloured as the design colours setup: the package orange,
 * the command purple. Flags keep the design's colours too: a value's orange, `--name` and `--after` blue, and a
 * switch such as `--json` green. A quoted message is blue, like `--name "Alice Chen"`.
 */
function cli(command: string, ...rest: readonly CommandPart[]): readonly CommandPart[] {
  return [
    { text: 'npx ' },
    { text: CLI_PACKAGE, color: 'orange' },
    { text: ' ' },
    { text: command, color: 'purple' },
    ...rest,
  ];
}

const SPACE: CommandPart = { text: ' ' };

/** A message in double quotes, in blue. */
function quoted(message: string): CommandPart {
  return { text: `"${message}"`, color: 'blue' };
}

export const HOME_SETUP: readonly HomeCommand[] = [
  { parts: cli('setup'), note: '# creates the inbox, offers a channel' },
  { parts: cli('channel add telegram') },
  { parts: cli('channel add slack') },
  { parts: cli('login'), note: '# keep it in your account' },
  { parts: cli('skill install'), note: '# teach your coding agent' },
];

export const HOME_USAGE: readonly HomeCommand[] = [
  { parts: cli('inbox send ask', SPACE, quoted('Which environment should I deploy to?')) },
  { parts: cli('inbox send approve', SPACE, quoted('Delete 342 stale records from prod?')) },
  {
    parts: cli('inbox send choose', SPACE, quoted('Pick a release strategy'), SPACE, {
      text: '--option canary --option blue-green',
      color: 'orange',
    }),
  },
  { parts: cli('inbox send', SPACE, quoted('Nightly build finished — 0 failures.')) },
  { parts: cli('inbox list', SPACE, { text: '--filter unread', color: 'orange' }), note: '# what people wrote' },
  { parts: cli('inbox reply', { text: ' conv_123 ' }, quoted('On it.')) },
  { parts: cli('contact list'), note: '# who --to can address' },
  { parts: cli('contact list', SPACE, { text: '--json', color: 'green' }) },
];

export const HOME_INVITES: readonly HomeCommand[] = [
  { parts: cli('contact invite', { text: ' alice ' }, { text: '--name "Alice Chen"', color: 'blue' }) },
  {
    parts: cli('contact invite', { text: ' bob ' }, { text: '--via telegram', color: 'orange' }, SPACE, {
      text: '--async',
      color: 'green',
    }),
  },
  { parts: cli('contact invite', { text: ' carol@acme.com ' }, { text: '--name "Carol Diaz"', color: 'blue' }) },
];

export const HOME_CONTACTS: readonly HomeCommand[] = [
  { parts: cli('contact list') },
  { parts: cli('contact list', SPACE, { text: '--json', color: 'green' }) },
  {
    parts: cli('contact list', SPACE, { text: '--limit 20', color: 'orange' }, SPACE, {
      text: '--after <cursor>',
      color: 'blue',
    }),
  },
];

export const HOME_FLAGS = [
  {
    flag: '--from',
    argument: '<name>',
    description: ['# attribution shown to the human ("Requested by deploy-bot")'],
  },
  {
    flag: '--ttl',
    argument: '<duration>',
    description: ['# how long the request stays answerable (default 24h, max 5d)'],
  },
  {
    flag: '--timeout',
    argument: '<duration>',
    description: [
      '# max time this invocation blocks; on timeout it exits 11',
      '# and the answer shows up in the conversation later',
    ],
  },
  {
    flag: '--async',
    description: ["# don't block; return at once and check the conversation later"],
  },
  {
    flag: '--json',
    description: ['# the full result for programmatic parsing'],
  },
  {
    flag: '--to',
    argument: '<id|email>[,...]',
    description: [
      '# address a linked human, or comma-separated humans\n# (find them with `contact list`; link others\n# first with `contact invite`)',
    ],
  },
  {
    flag: '--via',
    argument: '<channel>',
    description: ['# deliver on a specific linked channel instead of default'],
  },
] as const;

export const HOME_LINKS = [
  {
    label: 'github',
    href: SOURCE_URL,
  },
  { label: 'npm', href: PACKAGE_URL },
  { label: 'agents.md', href: '/agents.md' },
  { label: 'novu', href: 'https://novu.co/' },
  { label: 'for human', href: '/sapien' },
] as const;
