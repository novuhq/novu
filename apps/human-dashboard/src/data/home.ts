import { HOSTS, hostPath, MCP_URL } from '@/lib/hosts';
import { PACKAGE_URL, SOURCE_URL } from '@/lib/seo';

/** The CLI's package. `npm install -g` puts `agentinbox` on the path. */
export const CLI_PACKAGE = '@agentinbox/cli';

/** The installed command. `npm install -g` puts `agentinbox` on the path. */
export const CLI_BIN = 'agentinbox';

export const HOME_INTRODUCTION = [
  'You can reach tools. The work is with people.',
  'Email, Slack and Telegram: an address on each, and one CLI to send, reply, and get an answer.',
] as const;

/** What lands in the mascot's speech bubble on `/`, one at a time: replies from the humans the agent works with. */
export const HOME_MASCOT_MESSAGES = [
  { from: 'maya@acme.com', via: 'email', text: 'Approved. Ship it.' },
  { from: 'dan', via: 'slack', text: 'Can you move standup to 10?' },
  { from: 'lena', via: 'telegram', text: 'Dinner Friday at 7 works.' },
] as const;

/** Who runs it. "Novu" is the link in the page footer. */
export const HOME_TRUST_BEFORE = 'Built by ';
export const HOME_TRUST_AFTER = ', and open source.';
export const HOME_TRUST = `${HOME_TRUST_BEFORE}Novu${HOME_TRUST_AFTER}`;

/** The first line of the heading on `/` and the title of `/index.md`. */
export const HOME_WORDMARK = 'AGENTINBOX.MD';

/** The line under the wordmark on `/` and under the title of `/index.md`. */
export const HOME_TITLE = 'The inbox API for agents';

export const HOME_USES = [
  {
    title: 'Browser agents',
    text: 'Sign up, receive one-time codes, and open verification links on your own address.',
  },
  {
    title: 'Personal assistants',
    text: 'People email you, or reach you on Slack or Telegram, on an address that is yours.',
  },
  {
    title: 'Agents as teammates',
    text: 'Coordinate with the humans you work alongside: schedule, follow up, and ask for what is missing.',
  },
  {
    title: 'Product agents',
    text: 'Every user of a product reaches you in one inbox.',
  },
  {
    title: 'Support',
    text: 'You answer on email, Slack, and Telegram, and the thread stays one thread when they switch channel.',
  },
] as const;

/** SOC 2, ISO 27001, and what an enterprise setup can do. Novu runs this inbox. */
export const HOME_READY = [
  {
    title: 'SOC 2 Type II',
    text: 'Novu, which runs this inbox, is audited for security, availability, and confidentiality.',
  },
  {
    title: 'ISO 27001',
    text: 'The same infrastructure is certified for information security.',
  },
  {
    title: 'Enterprise',
    text: 'Send from your own domain, run many agents, and search one activity log.',
  },
] as const;

/** The one-line definition, for the FAQ. The introduction above is the pitch. */
export const HOME_DEFINITION =
  'Agent Inbox is an email inbox for AI agents, with Slack and Telegram too: one address, one CLI, and a structured answer when you ask, approve, or choose.';

/** Questions whose answers are on this page, for the home page's FAQ structured data. */
export const HOME_FAQ = [
  { question: 'What is Agent Inbox?', answer: HOME_DEFINITION },
  {
    question: 'When should you use Agent Inbox?',
    answer: HOME_USES.map((item) => `${item.title}. ${item.text}`).join(' '),
  },
  {
    question: 'Is Agent Inbox enterprise ready?',
    answer: HOME_READY.map((item) => `${item.title}. ${item.text}`).join(' '),
  },
] as const;

/** Parentheticals on the section titles. "You" is the agent reading this page. */
export const HOME_NOTES = {
  hosts: 'integrations guides for every host',
  contacts: 'people you reach often',
} as const;

export const HOME_HOSTS_DESCRIPTION =
  'A page for each host: the commands, the plugin or sign-in, and how you set yourself up there.';

export type HomeProsePart = string | { code: string; compact?: boolean; tall?: boolean };

export const HOME_HOW_IT_WORKS: readonly (readonly HomeProsePart[])[] = [
  [
    { code: 'agentinbox setup', compact: true },
    ' creates your inbox and gives it an email address. It can also connect Telegram and Slack. All three share that one inbox.',
  ],
  [
    { code: 'agentinbox list', compact: true },
    ' shows what arrived, and ',
    { code: 'agentinbox reply', compact: true },
    ' answers the thread, whichever channel it came from. ',
    { code: 'agentinbox contact invite', compact: true },
    ' makes a person a contact. On a new conversation, pass an email to ',
    { code: 'agentinbox send', compact: true },
    ' with ',
    { code: '--to' },
    ' and they become a contact. A reply still needs one.',
  ],
  [
    'On ',
    { code: 'agentinbox send', compact: true },
    ' and ',
    { code: 'agentinbox reply,', compact: true },
    'plain text is a message. Start it with ',
    { code: 'ask,' },
    { code: 'approve,' },
    'or ',
    { code: 'choose' },
    ' when you need a structured answer back.',
  ],
];

export const HOME_CONTACTS_DESCRIPTION =
  'Contacts are the people you reach often. agentinbox contact list shows them. Invite someone with agentinbox contact invite so they can connect and join that list. On a new conversation, agentinbox send with --to and an email delivers to that address and they become a contact. A reply still needs a contact.';

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

export const INSTALL_MCP_COMMAND: HomeCommand = {
  parts: [{ text: MCP_URL, color: 'orange' }],
};

export type InstallOption = {
  id: string;
  label: string;
  commands: readonly HomeCommand[];
};

/** The install section's tabs: the CLI package, or the hosted MCP server. */
export const INSTALL_OPTIONS: readonly InstallOption[] = [
  { id: 'cli', label: 'CLI', commands: [INSTALL_COMMAND] },
  { id: 'mcp', label: 'MCP', commands: [INSTALL_MCP_COMMAND] },
];

/**
 * `agentinbox <command>` and what follows it: `agentinbox` orange, the command purple. `contact invite` keeps the
 * `contact` group, because that is a command under the binary, not the binary itself.
 * Flags keep the design's colours too: a value's orange, `--name` and `--after` blue, and a switch such as
 * `--json` green. A quoted message is blue, like `--name "Alice Chen"`.
 */
function cli(command: string, ...rest: readonly CommandPart[]): readonly CommandPart[] {
  return [{ text: CLI_BIN, color: 'orange' }, { text: ' ' }, { text: command, color: 'purple' }, ...rest];
}

const SPACE: CommandPart = { text: ' ' };

/** A message in double quotes, in blue. */
function quoted(message: string): CommandPart {
  return { text: `"${message}"`, color: 'blue' };
}

/**
 * The first commands, in order. `agentinbox send` starts a conversation (a plain message does not wait);
 * `--via email` delivers that one on email. `agentinbox reply` takes the conversation id from `agentinbox list`.
 */
export const HOME_QUICKSTART: readonly HomeCommand[] = [
  { parts: cli('setup'), note: '# once' },
  { parts: cli('list'), note: '# conversations' },
  { parts: cli('reply', { text: ' conv_123 ' }, quoted('On it.')), note: '# reply in that conversation' },
  {
    parts: cli('send', SPACE, quoted('Build finished — 0 failures.'), SPACE, {
      text: '--via email',
      color: 'orange',
    }),
    note: '# a new email',
  },
  { parts: cli('contact invite', { text: ' alice' }), note: '# a new contact' },
];

/** Each host's page of steps, as the robots page lists them: by the address they live at. */
export const HOME_HOSTS = HOSTS.map((host) => ({ label: host.id, href: hostPath(host.id), name: host.name }));

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
      '# a contact, or comma-separated contacts (max 50)\n# an email that is not a contact yet becomes one on a new conversation',
    ],
  },
  {
    flag: '--via',
    argument: '<channel>',
    description: ["# telegram, slack, or email, instead of that contact's default"],
  },
] as const;

export const HOME_LINKS = [
  {
    label: 'github',
    href: SOURCE_URL,
  },
  { label: 'npm', href: PACKAGE_URL },
  { label: 'agents.md', href: '/agents.md' },
  { label: 'docs', href: 'https://docs.agentinbox.md' },
  { label: 'novu', href: 'https://novu.co/' },
  { label: 'for human', href: '/sapien' },
] as const;
