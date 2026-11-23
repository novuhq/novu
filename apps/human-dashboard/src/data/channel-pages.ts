import type { FaqItem } from '@/data/sapien-faq';
import { SITE_ORIGIN } from '@/lib/seo';

/*
 * Copy for the Agent Inbox channel pages (3 hubs) and agent pages (10 agents on each channel), from the
 * content spec. Copy is kept as written in the spec, including its `inline code` backticks; `plain()` drops
 * the backticks where the text is rendered. Code fields keep the `$ ` prompt only where the spec shows it.
 */

export const CHANNEL_IDS = ['email', 'telegram', 'slack'] as const;
export type ChannelId = (typeof CHANNEL_IDS)[number];
export const AGENT_IDS = [
  'claude-code',
  'codex',
  'opencode',
  'cursor',
  'hermes',
  'openclaw',
  'claude',
  'chatgpt',
  'grok-bot',
  'any-agent',
] as const;
export type AgentId = (typeof AGENT_IDS)[number];

export type AgentIcon = { src: string; invert?: boolean };

/** Agent cards: the hub's "Works with your agent" grid and the related-agents row on agent pages. */
export const AGENTS: Record<AgentId, { name: string; description: string; icon: AgentIcon }> = {
  'claude-code': {
    name: 'Claude Code',
    description: 'Asks you before it acts, and a message can start it',
    icon: { src: '/images/landing/claude-code.svg' },
  },
  codex: {
    name: 'Codex',
    description: 'Checks in with you before it ships changes',
    icon: { src: '/images/landing/codex.svg' },
  },
  opencode: {
    name: 'OpenCode',
    description: 'Asks from the terminal, you answer from anywhere',
    icon: { src: '/tools/opencode.svg' },
  },
  cursor: {
    name: 'Cursor',
    description: 'Lets its agents ask you instead of guessing',
    icon: { src: '/images/landing/cursor.svg' },
  },
  hermes: {
    name: 'Hermes',
    description: 'Reports back from wherever it runs',
    icon: { src: '/images/landing/hermes.svg' },
  },
  openclaw: {
    name: 'OpenClaw',
    description: "Your personal assistant, reachable when you're away",
    icon: { src: '/images/landing/openclaw.svg' },
  },
  claude: {
    name: 'Claude',
    description: 'Reaches people for you from the chat',
    // Claude Code shares Claude's mark (see `lib/hosts.ts`).
    icon: { src: '/images/landing/claude-code.svg' },
  },
  chatgpt: {
    name: 'ChatGPT',
    description: 'Sends messages and gets answers from the chat',
    // The mark is black on transparent; inverted so it reads on the dark tile.
    icon: { src: '/tools/chatgpt.png', invert: true },
  },
  'grok-bot': {
    name: 'Grok Bot',
    description: 'Asks you before it acts on your behalf',
    icon: { src: '/tools/grok.png' },
  },
  'any-agent': {
    name: 'Any agent',
    description: 'Anything that runs a command or speaks MCP',
    icon: { src: '/images/landing/any-agent.svg' },
  },
};

export const CHANNELS = {
  email: {
    name: 'Email',
    /** "Give your AI agent its own …" */
    noun: 'email address',
    /** "Give your agent … Today" */
    ctaNoun: 'an email address',
    /** "What your agent can do …", "Ask, approve, choose, tell …" */
    location: 'over email',
    /** "Connect Claude Code to …" */
    h1Name: 'email',
  },
  telegram: {
    name: 'Telegram',
    noun: 'Telegram bot',
    ctaNoun: 'a Telegram bot',
    location: 'on Telegram',
    h1Name: 'Telegram',
  },
  slack: {
    name: 'Slack',
    noun: 'Slack app',
    ctaNoun: 'a Slack app',
    location: 'in Slack',
    h1Name: 'Slack',
  },
} satisfies Record<ChannelId, { name: string; noun: string; ctaNoun: string; location: string; h1Name: string }>;

export function isChannelId(value: string): value is ChannelId {
  return CHANNEL_IDS.some((id) => id === value);
}
export function isAgentId(value: string): value is AgentId {
  return AGENT_IDS.some((id) => id === value);
}
/** Every agent has a page on every channel. */
export function hasAgentPage(_channel: ChannelId, agent: string): agent is AgentId {
  return isAgentId(agent);
}
export function agentPagePairs() {
  return CHANNEL_IDS.flatMap((channel) => AGENT_IDS.map((agent) => ({ channel, agent })));
}
export function otherAgentChannels(channel: ChannelId, _agent: AgentId) {
  return CHANNEL_IDS.filter((id) => id !== channel);
}
export function relatedAgents(agent?: AgentId) {
  return AGENT_IDS.filter((id) => id !== agent);
}
export function setupCommand(channel: ChannelId) {
  return `npx @agentinbox/cli setup ${channel}`;
}
export function setupPrompt(channel: ChannelId, agent?: AgentId) {
  const name = agent && agent !== 'any-agent' ? ` for ${AGENTS[agent].name}` : '';
  return `Set up Agent Inbox${name} ${CHANNELS[channel].location}. Read ${SITE_ORIGIN}/agents.md for setup instructions. Before running ${setupCommand(channel)} in a non-interactive terminal, ask me for any required operator email address and agent name, and pass them with --email and --agent-name. Show me the setup link to complete, then use Agent Inbox to ask questions, request approvals, offer choices, and send updates.`;
}

/** Spec copy marks inline code with backticks; the pages render it as plain text. */
export function plain(text: string) {
  return text.replace(/`/g, '');
}

/** A code block as the spec writes it: one command per line, `$ ` where the spec shows the prompt. */
export function codeLines(code: string) {
  return code.split('\n').map((line) => ({ prompt: line.startsWith('$ '), text: line.replace(/^\$ /, '') }));
}
/** What a copy button copies: the commands without the `$ `. */
export function copyText(code: string) {
  return codeLines(code)
    .map((line) => line.text)
    .join('\n');
}
/** Hero and CTA commands show the `$` prompt only when they are shell commands. */
export function isShellCommand(code: string) {
  return /^(npx|npm|agentinbox|codex|opencode|hermes) /.test(code);
}

export type Feature = { title: string; description: string };
export type SetupStep = { title: string; description: string; code?: string; output?: string };
export type MessageExample = {
  id: 'ask' | 'approve' | 'choose' | 'tell';
  label: string;
  description: string;
  command: string;
  result: string;
  resultNote?: string;
  image: string;
  alt: string;
};
export type ReachItem = { title: string; description: string; command?: string };
export type UseCase = { label: string; title: string; description: string; command: string };
export type Faq = { question: string; answer: string };
export type Prompt = { prompt: string; note?: string; result: string };

export type ChannelHub = {
  metaTitle: string;
  metaDescription: string;
  subhead: string;
  heroAlt: string;
  features: Feature[];
  steps: SetupStep[];
  messageIntro: string;
  messages: MessageExample[];
  reach: ReachItem[];
  useCases: UseCase[];
  faq: Faq[];
};

export type AgentPage = {
  metaTitle: string;
  metaDescription: string;
  intro: string;
  hero: string;
  heroAlt: string;
  benefitsHeading: readonly [string, string];
  benefitsIntro: string;
  benefits: Feature[];
  setupIntro: string;
  steps: SetupStep[];
  prompts: Prompt[];
  faq: Faq[];
  cta: string;
};

const INSTALL_OUTPUT = 'added 1 package in 2s\n✓ agentinbox is ready';
const MCP_URL = 'https://mcp.agentinbox.md';
const CURSOR_JSON = '{ "mcpServers": { "AgentInbox": { "url": "https://mcp.agentinbox.md" } } }';
const GROK_PROMPT = 'Set up Agent Inbox from https://www.agentinbox.md/agents.md';
const CLAUDE_PLUGIN = '/plugin marketplace add agentinboxhq/skills\n/plugin install agentinbox@agentinbox';
const AUTONOMOUS = ['Autonomous, but', 'never unsupervised'] as const;
const FROM_THE_CHAT = ['Reach people', 'from the chat'] as const;

const MESSAGE_IMAGES = {
  ask: { image: 'hero-telegram.jpg', alt: 'An agent asks where to send a receipt and receives an email address.' },
  approve: { image: 'approve-text.svg', alt: 'An approval request with Approve and Deny options.' },
  // Choose and Tell are drawn in code from `HUB_VISUALS`, so they show the hub's own channel.
  choose: { image: '', alt: '' },
  tell: { image: '', alt: '' },
} as const;

function message(
  id: MessageExample['id'],
  description: string,
  command: string,
  result: string,
  resultNote?: string
): MessageExample {
  const label = id.charAt(0).toUpperCase() + id.slice(1);
  return { id, label, description, command, result, resultNote, ...MESSAGE_IMAGES[id] };
}

/* ------------------------------------------------------------------ hubs */

const HUBS: Record<ChannelId, ChannelHub> = {
  email: {
    metaTitle: 'Email for AI Agents: Give Your Agent Its Own Address | Agent Inbox',
    metaDescription:
      'Give your AI agent its own email address. It emails you, asks for approval with buttons, reads your replies, and gets mail from people and services.',
    subhead:
      'Your agent gets an address at agentinbox.mx as soon as you set it up. It emails you, waits for your answer, and reads the mail people and services send it.',
    heroAlt: 'An email from an AI agent asking to approve a refund, with Approve and Deny buttons',
    features: [
      {
        title: 'Its own address',
        description: "Every agent gets a name@agentinbox.mx address at setup. There's no mail server to run.",
      },
      {
        title: 'Approvals with buttons',
        description: 'Approve and Deny arrive as buttons in the email. One click sends the answer to your agent.',
      },
      {
        title: 'Answers by reply',
        description: 'Your agent asks, you hit reply. The answer goes back to the agent in the same conversation.',
      },
      {
        title: 'Mail from people and services',
        description: 'Anyone can write first, including services that send sign-up links and verification codes.',
      },
    ],
    steps: [
      {
        title: 'Install the CLI',
        description: 'Install it once, or run any command with `npx @agentinbox/cli`.',
        code: '$ npm i -g @agentinbox/cli',
        output: INSTALL_OUTPUT,
      },
      {
        title: 'Create and claim the address',
        description: 'Create the address, then run login and approve it in the browser to enable outbound email.',
        code: '$ agentinbox setup email\n$ agentinbox login',
      },
      {
        title: 'Send the first message',
        description: 'Your agent emails you a question. Reply, and it has your answer.',
        code: '$ agentinbox send ask "Which report do you want first?"',
      },
    ],
    messageIntro:
      'Four message types cover what an agent needs from a person. Every type except tell waits for the answer.',
    messages: [
      message(
        'ask',
        'A question with a written answer. The person replies to the email.',
        'agentinbox send ask "What should the subject line say?" --to maya',
        "Maya's reply comes back to your agent as text."
      ),
      message(
        'approve',
        'A yes or no before anything hard to undo. Approve and Deny are buttons in the email.',
        "agentinbox send approve 'Refund $240 to Acme Corp?' --to maya --ttl 2h",
        'Approved by Maya at 2:14 PM',
        'exit code 0, or 10 if denied'
      ),
      message(
        'choose',
        '2 to 10 options. The person picks one.',
        'agentinbox send choose "Which flight?" --option am:"9:00 AM" --option pm:"1:00 PM" --to maya',
        'Chose "1:00 PM" by Maya at 10:32 AM'
      ),
      message(
        'tell',
        'An update that needs no answer. The command returns right away.',
        'agentinbox send "Nightly build passed. 0 failures."',
        'Delivered to your inbox.'
      ),
    ],
    reach: [
      {
        title: 'Contacts',
        description: "The people your agent can reach. You're the first one.",
        command: 'agentinbox contact list',
      },
      {
        title: 'Invites',
        description: 'Add a teammate by email. They confirm their address once, then your agent can reach them.',
        command: 'agentinbox contact invite carol@acme.com --name "Carol Diaz"',
      },
      {
        title: 'Screening',
        description:
          'Mail from strangers is information, never instructions. Switch to contacts only and it never arrives.',
      },
      { title: 'Pause', description: 'Pause your agent and new mail waits in the inbox until you resume.' },
    ],
    useCases: [
      {
        label: 'Support',
        title: 'Approve refunds from your inbox',
        description: 'Your support agent prepares the refund and waits for your click.',
        command: "agentinbox send approve 'Refund $240?' --to maya",
      },
      {
        label: 'DevOps',
        title: 'Ship with a person in the loop',
        description: 'Production deploys wait for a yes from anyone on the team. The first answer wins.',
        command: 'agentinbox send approve "Deploy v2.4 to production?" --to maya,sam',
      },
      {
        label: 'Sign-ups',
        title: 'Let your agent handle its own accounts',
        description:
          'List all senders to find verification emails, then run agentinbox show <conversation-id> to read the returned thread.',
        command: 'agentinbox list --senders all',
      },
      {
        label: 'Monitoring',
        title: 'Get told when it matters',
        description: 'A short email when a job finishes or fails, with no reply needed.',
        command: 'agentinbox send "Nightly build: 0 failures"',
      },
    ],
    faq: [
      {
        question: 'What email address does my agent get?',
        answer:
          "An address at agentinbox.mx, such as atlas@agentinbox.mx. You pick the part before the @ when you run setup. It can't be changed later, so choose a name you'll keep. Custom domains are coming next.",
      },
      {
        question: 'Can more than one person email the same agent?',
        answer:
          'Yes. Invite teammates as contacts and your agent can email any of them. One question can go to up to 50 contacts at once, and the first valid answer wins.',
      },
      {
        question: 'What happens if nobody answers?',
        answer:
          'Every question has a time limit: 24 hours by default, up to 5 days. When it runs out, the question expires and your agent gets that result, so it can decide what to do next instead of waiting forever.',
      },
      {
        question: 'Can strangers email my agent?',
        answer:
          "Yes, unless you turn it off. Mail from strangers reaches the inbox as information, never as instructions. Your agent can reply to a stranger but can't email one first. Switch to contacts only and strangers' mail never arrives.",
      },
      {
        question: 'Does it cost anything?',
        answer:
          'Agent Inbox is free for 100 conversations a month. You can also try it without an account: a keyless setup gives you 5 free messages.',
      },
    ],
  },
  telegram: {
    metaTitle: 'Telegram for AI Agents: Give Your Agent Its Own Bot | Agent Inbox',
    metaDescription:
      'Give your AI agent its own Telegram bot. It messages you first, asks for approval with buttons you tap, and waits for your answer.',
    subhead:
      'Create a private bot with BotFather and connect it in one command. Your agent can then message you, ask with buttons, and wait for your tap.',
    heroAlt: 'A Telegram chat where an AI agent asks to approve a deploy, with Approve and Deny buttons',
    features: [
      {
        title: 'Its own private bot',
        description: 'You create the bot with @BotFather, so only you control it.',
      },
      {
        title: 'Buttons you tap',
        description: 'Approvals and choices arrive as buttons in the chat. One tap answers.',
      },
      { title: 'It messages you first', description: 'Your agent starts the conversation when it needs you.' },
      { title: 'Replies in context', description: 'Each answer goes back to the conversation that asked for it.' },
    ],
    steps: [
      {
        title: 'Install the CLI',
        description: 'Install it once, or run any command with `npx @agentinbox/cli`.',
        code: '$ npm i -g @agentinbox/cli',
        output: INSTALL_OUTPUT,
      },
      {
        title: 'Connect Telegram',
        description:
          'Create a bot with @BotFather, paste its token in the terminal or on the setup page, then tap Start.',
        code: '$ agentinbox setup telegram',
      },
      {
        title: 'Send the first message',
        description: 'Your agent messages you on Telegram. Answer in the chat.',
        code: '$ agentinbox send ask "Which branch should I test first?" --via telegram',
      },
    ],
    messageIntro:
      'Four message types cover what an agent needs from a person. Every type except tell waits for the answer.',
    messages: [
      message(
        'ask',
        'A question with a typed answer. The person replies in the chat.',
        'agentinbox send ask "Is staging back up?" --to ana --via telegram',
        "Ana's reply comes back to your agent as text."
      ),
      message(
        'approve',
        'A yes or no before anything hard to undo. Two buttons in the chat.',
        'agentinbox send approve "Restart the production database?" --to ana --ttl 1h',
        'Approved by Ana at 9:41 AM',
        'exit code 0, or 10 if denied'
      ),
      message(
        'choose',
        '2 to 10 options as buttons. One tap picks.',
        'agentinbox send choose "Where should we eat?" --option ramen:"Ramen bar" --option tacos:"Taco place" --to ana',
        'Chose "Ramen bar" by Ana at 12:05 PM'
      ),
      message(
        'tell',
        'An update that needs no answer. The command returns right away.',
        'agentinbox send "Scrape finished: 1,204 rows" --via telegram',
        'Delivered to your chat.'
      ),
    ],
    reach: [
      {
        title: 'Contacts',
        description: "The people your agent can reach. You're the first one.",
        command: 'agentinbox contact list',
      },
      {
        title: 'Invites',
        description: 'Send a teammate a link that opens your bot. Once they tap Start, your agent can reach them.',
        command: 'agentinbox contact invite carol --name "Carol Diaz" --via telegram',
      },
      {
        title: 'Screening',
        description:
          'Messages from strangers are information, never instructions. Switch to contacts only and they never arrive.',
      },
      { title: 'Pause', description: 'Pause your agent and new messages wait in the inbox until you resume.' },
    ],
    useCases: [
      {
        label: 'Support',
        title: 'Approve refunds from your phone',
        description: 'The refund waits for your tap, wherever you are.',
        command: "agentinbox send approve 'Refund $240?' --to maya",
      },
      {
        label: 'DevOps',
        title: 'Approve deploys on call',
        description: 'The on-call engineer gets the deploy request in Telegram and answers with a tap.',
        command: 'agentinbox send approve "Deploy v2.4 to prod?" --to oncall',
      },
      {
        label: 'Personal assistant',
        title: 'Let your assistant ask, not guess',
        description: 'Options arrive as buttons, so picking takes a second.',
        command: 'agentinbox send choose "Which flight?" --option 9am --option 1pm',
      },
      {
        label: 'Monitoring',
        title: 'Get told when it matters',
        description: 'A short message when a job finishes or fails.',
        command: 'agentinbox send "Nightly build: 0 failures"',
      },
    ],
    faq: [
      {
        question: 'Do I create my own Telegram bot?',
        answer:
          'Yes. You create a private bot with @BotFather and paste its token in your terminal or on the Agent Inbox setup page. Only you control it, and the token never goes into a chat with your agent.',
      },
      {
        question: 'Can my team use the same bot?',
        answer:
          'Yes. Invite teammates as contacts and each gets a link that opens the bot. Your agent can then message any of them, or ask up to 50 at once and take the first valid answer.',
      },
      {
        question: 'What happens if nobody taps a button?',
        answer:
          'Every question has a time limit: 24 hours by default, up to 5 days. When it runs out, the question expires and your agent gets that result, so it can decide what to do next.',
      },
      {
        question: 'Can my bot message strangers?',
        answer:
          'No. Your agent starts conversations only with contacts. If a stranger writes first, the message arrives as information, never as instructions, and your agent can reply. Switch to contacts only to keep strangers out.',
      },
      {
        question: 'Does it cost anything?',
        answer:
          'Agent Inbox is free for 100 conversations a month. You can also try it without an account: a keyless setup gives you 5 free messages.',
      },
    ],
  },
  slack: {
    metaTitle: 'Slack for AI Agents: Give Your Agent Its Own Slack App | Agent Inbox',
    metaDescription:
      'Give your AI agent its own Slack app. It messages you and your team, asks for approval with buttons, and waits for an answer in your workspace.',
    subhead:
      'Your agent joins your workspace as its own app. It messages you and your teammates, asks for approval with buttons, and waits for the answer.',
    heroAlt:
      'A Slack message where an AI agent asks the team to approve a refund, with a Stripe icon and Approve and Deny buttons',
    features: [
      {
        title: 'Its own Slack app',
        description: 'Your agent installs as its own app in your workspace, under its own name.',
      },
      { title: 'Buttons in the message', description: 'Approve, Deny and options are buttons. One click answers.' },
      { title: 'Your team, not only you', description: 'Ask several teammates at once and take the first answer.' },
      {
        title: 'Cards with context',
        description: "A subtitle, body text and a tool icon show people what they're approving.",
      },
    ],
    steps: [
      {
        title: 'Install the CLI',
        description: 'Install it once, or run any command with `npx @agentinbox/cli`.',
        code: '$ npm i -g @agentinbox/cli',
        output: INSTALL_OUTPUT,
      },
      {
        title: 'Connect Slack',
        description: 'Paste a Slack App Configuration Token, then click Add to Slack.',
        code: '$ agentinbox setup slack',
      },
      {
        title: 'Send the first message',
        description: 'Your agent messages you in Slack. Click a button to answer.',
        code: '$ agentinbox send approve "Merge the release branch?" --via slack',
      },
    ],
    messageIntro:
      'Four message types cover what an agent needs from a person. Every type except tell waits for the answer.',
    messages: [
      message(
        'ask',
        'A question with a typed answer. The person replies in Slack.',
        'agentinbox send ask "Which customer reported the bug?" --to dan --via slack',
        "Dan's reply comes back to your agent as text."
      ),
      message(
        'approve',
        "A yes or no, shown as a card with buttons. Slack also shows the tool's icon.",
        'agentinbox send approve "Issue the refund?" --icon stripe --subtitle "ORD-42" --body \'Refund $25.00\' --to dan,maya',
        'Approved by Dan at 3:20 PM',
        'exit code 0, or 10 if denied'
      ),
      message(
        'choose',
        '2 to 10 options as buttons.',
        'agentinbox send choose "Which environment?" --option stg:Staging --option prd:Production --to dan',
        'Chose "Staging" by Dan at 3:24 PM'
      ),
      message(
        'tell',
        'An update that needs no answer. The command returns right away.',
        'agentinbox send "Release v2.4 is live" --via slack',
        'Delivered to Slack.'
      ),
    ],
    reach: [
      {
        title: 'Contacts',
        description: "The people your agent can reach. You're the first one.",
        command: 'agentinbox contact list',
      },
      {
        title: 'Invites',
        description: 'Send a teammate a link that connects them in Slack.',
        command: 'agentinbox contact invite dan --name "Dan Kim" --via slack',
      },
      {
        title: 'Screening',
        description:
          "Messages from people who aren't contacts are information, never instructions. Switch to contacts only and they never arrive.",
      },
      { title: 'Pause', description: 'Pause your agent and new messages wait in the inbox until you resume.' },
    ],
    useCases: [
      {
        label: 'Support',
        title: 'Let the team approve refunds',
        description: 'Anyone on the support team can approve. The first answer wins.',
        command: "agentinbox send approve 'Refund $240?' --to maya,dan",
      },
      {
        label: 'DevOps',
        title: 'Ship with a person in the loop',
        description: 'Deploys wait for a click from someone on the team, in the channel where they already work.',
        command: 'agentinbox send approve "Deploy v2.4 to prod?" --to maya,dan',
      },
      {
        label: 'Operations',
        title: 'Let the team pick',
        description: 'Options arrive as buttons, and your agent goes with the choice.',
        command: 'agentinbox send choose "Which vendor?" --option a:Northwind --option b:Contoso',
      },
      {
        label: 'Monitoring',
        title: 'Get told when it matters',
        description: 'A short Slack message when a job finishes or fails.',
        command: 'agentinbox send "Nightly build: 0 failures"',
      },
    ],
    faq: [
      {
        question: 'What do I need to connect Slack?',
        answer:
          'A Slack App Configuration Token and permission to install apps in your workspace. Paste the token in the terminal or on the setup page, then click Add to Slack. If your workspace needs admin approval for new apps, an admin approves the install.',
      },
      {
        question: 'Can teammates answer instead of me?',
        answer:
          'Yes. Invite them as contacts, then send one question to up to 50 people. The first valid answer wins, and your agent sees who answered and when.',
      },
      {
        question: 'What happens if nobody answers?',
        answer:
          'Every question has a time limit: 24 hours by default, up to 5 days. When it runs out, the question expires and your agent gets that result, so it can decide what to do next.',
      },
      {
        question: 'Can anyone in the workspace message my agent?',
        answer:
          "They can, unless you switch to contacts only. Messages from people who aren't contacts arrive as information, never as instructions. Your agent can reply to them but can't message them first.",
      },
      {
        question: 'Does it cost anything?',
        answer:
          'Agent Inbox is free for 100 conversations a month. You can also try it without an account: a keyless setup gives you 5 free messages.',
      },
    ],
  },
};

/* ------------------------------------------------------------ agent pages */

const EMAIL_AGENTS: Record<AgentId, AgentPage> = {
  'claude-code': {
    metaTitle: 'Connect Claude Code to Email | Agent Inbox',
    metaDescription:
      'Give Claude Code its own email address. It emails you before risky changes, waits for your reply, and can start work when you email it.',
    intro:
      "Claude Code gets its own address. It emails you before it does anything you'd want to check, and with `listen`, an email from you can start it in your project.",
    hero: CLAUDE_PLUGIN,
    heroAlt: 'Claude Code asking for approval to run a database migration, shown as an email',
    benefitsHeading: AUTONOMOUS,
    benefitsIntro: 'Claude Code does its best work when it can leave you alone and still reach you.',
    benefits: [
      {
        title: 'Approve before it acts',
        description: 'Migrations, force pushes and deploys wait for your click in an email.',
      },
      {
        title: 'Start it by email',
        description:
          'With `listen`, an email from you starts Claude Code in your project, and it replies in the thread.',
      },
      {
        title: 'Answer from any mail app',
        description: 'Reply to its question from your phone. The answer goes back to the right conversation.',
      },
    ],
    setupIntro: 'Install the plugin for the skills and the MCP server, then optionally let email start Claude Code.',
    steps: [
      {
        title: 'Install the plugin',
        description: 'In Claude Code, add the marketplace and install Agent Inbox.',
        code: CLAUDE_PLUGIN,
      },
      { title: 'Sign in', description: 'Run `/mcp` and authenticate Agent Inbox in your browser.', code: '/mcp' },
      {
        title: 'Create your agent',
        description: 'No agent yet? Ask Claude Code to set one up. It asks you for a name and an address.',
        code: 'Set up my Agent Inbox.',
      },
      {
        title: 'Let email start it (optional)',
        description: 'Log the CLI in, then run `listen` in your project folder.',
        code: 'npx @agentinbox/cli login\nnpx @agentinbox/cli listen claude-code',
      },
    ],
    prompts: [
      {
        prompt: 'Before you run the migration, email me for approval.',
        result: 'Claude Code sends an email with Approve and Deny buttons and waits for your click.',
      },
      {
        prompt: 'If the tests still fail after two tries, email me what you found.',
        result: 'You get a summary and can reply with what to try next.',
      },
      {
        prompt: 'Email me a summary when the refactor is done.',
        result: "A tell message. Claude Code doesn't wait for a reply.",
      },
    ],
    faq: [
      {
        question: 'Does Claude Code have to stay open while it waits for my reply?',
        answer:
          "It waits while the session runs. With `listen`, it doesn't need to: your email starts a new run in the project and picks up that conversation's session.",
      },
      {
        question: 'Can I use the CLI instead of the plugin?',
        answer:
          "Yes. Install the skills with `npx skills add agentinboxhq/skills --agent claude-code` and Claude Code runs the CLI. Don't add the MCP server by hand next to the plugin, or every tool shows up twice.",
      },
      {
        question: 'Who can start Claude Code by email?',
        answer:
          'You, and any contact you turn on Listen to for on agentinbox.md. Mail from strangers never starts a run.',
      },
    ],
    cta: '/plugin marketplace add agentinboxhq/skills',
  },
  codex: {
    metaTitle: 'Connect Codex to Email | Agent Inbox',
    metaDescription:
      'Give Codex its own email address. It asks you before it ships changes, waits for your reply, and emails you when the task is done.',
    intro:
      'Codex gets its own address at agentinbox.mx. It emails you when it needs a decision and carries on once you reply.',
    hero: 'codex plugin marketplace add agentinboxhq/skills',
    heroAlt: 'An email from Codex asking for approval before pushing to main',
    benefitsHeading: AUTONOMOUS,
    benefitsIntro: 'Hand Codex longer tasks without giving up the final say.',
    benefits: [
      {
        title: 'Sign off on the risky parts',
        description: 'Pushing to main or changing a schema waits for your Approve.',
      },
      {
        title: 'Decide away from the terminal',
        description: 'Its questions arrive as email, so you can answer from anywhere.',
      },
      {
        title: 'A record of every answer',
        description: 'Each question, answer and who gave it stays in one email thread.',
      },
    ],
    setupIntro: 'The Agent Inbox plugin for Codex comes with the MCP server and the skills.',
    steps: [
      {
        title: 'Add the marketplace',
        description: 'Add the Agent Inbox marketplace to Codex.',
        code: 'codex plugin marketplace add agentinboxhq/skills',
      },
      {
        title: 'Install the plugin',
        description: 'Or install it from `/plugins` in Codex.',
        code: 'codex plugin add agentinbox@agentinbox',
      },
      {
        title: 'Sign in',
        description: 'Opens the Agent Inbox sign-in in your browser.',
        code: 'codex mcp login AgentInbox',
      },
      {
        title: 'Try it',
        description: 'Start a session and ask Codex to email you.',
        code: 'Email me when the tests pass.',
      },
    ],
    prompts: [
      {
        prompt: 'Ask me by email before you push anything to main.',
        result: 'Codex sends an approval email and waits for your click.',
      },
      {
        prompt: 'If the API change breaks a client, email me the options.',
        result: 'Codex lists the options and waits for your pick.',
      },
      {
        prompt: "Email me what changed when you're done.",
        result: "A summary lands in your inbox. Codex doesn't wait for a reply.",
      },
    ],
    faq: [
      {
        question: 'How does Codex get the inbox tools?',
        answer:
          'The Agent Inbox plugin for Codex includes the MCP server and the Agent Inbox skills. Codex checks the marketplace each time it starts and updates the plugin.',
      },
      {
        question: 'Can I add the MCP server without the plugin?',
        answer:
          'Yes. Run `codex mcp add AgentInbox --url https://mcp.agentinbox.md`, then `codex mcp login AgentInbox`. Use one or the other, not both.',
      },
      {
        question: "What if I don't reply in time?",
        answer:
          'Each question has a time limit: 24 hours by default, up to 5 days. When it runs out, Codex gets an expired result and decides what to do next.',
      },
    ],
    cta: 'codex plugin marketplace add agentinboxhq/skills',
  },
  opencode: {
    metaTitle: 'Connect OpenCode to Email | Agent Inbox',
    metaDescription:
      "Give OpenCode its own email address. Add the Agent Inbox MCP server and it can ask you, wait for your reply, and email you when it's done.",
    intro: "OpenCode works in your terminal. With Agent Inbox, it can email you when you've stepped away from it.",
    hero: 'opencode mcp add AgentInbox --url https://mcp.agentinbox.md',
    heroAlt: 'OpenCode in a terminal sending an email question to its operator',
    benefitsHeading: AUTONOMOUS,
    benefitsIntro: 'Leave OpenCode running and still make the calls that matter.',
    benefits: [
      {
        title: 'Step away from the terminal',
        description: 'OpenCode emails you when it needs input instead of sitting at a prompt.',
      },
      { title: 'Approve before it acts', description: 'Deletes, migrations and releases wait for your click.' },
      {
        title: 'One project or all of them',
        description: 'Add the server to one project, or add `--global` for every project.',
      },
    ],
    setupIntro: 'Add the MCP server for the inbox tools and the skills so OpenCode knows when to use them.',
    steps: [
      {
        title: 'Add the MCP server',
        description: 'Run it in your project, or add `--global` for every project.',
        code: 'opencode mcp add AgentInbox --url https://mcp.agentinbox.md',
      },
      {
        title: 'Sign in',
        description: 'Sign in to Agent Inbox in your browser.',
        code: 'opencode mcp auth AgentInbox',
      },
      {
        title: 'Add the skills',
        description: 'They teach OpenCode when to reach you and how to read answers.',
        code: 'npx skills add agentinboxhq/skills',
      },
      { title: 'Check it', description: 'Shows whether Agent Inbox is signed in.', code: 'opencode mcp list' },
    ],
    prompts: [
      {
        prompt: 'Email me before you delete any files outside src.',
        result: 'OpenCode sends an approval email and waits.',
      },
      { prompt: 'Ask me by email which of these two fixes to keep.', result: 'You get both options and pick one.' },
      { prompt: 'When the build finishes, email me the result.', result: 'A tell message, with no reply needed.' },
    ],
    faq: [
      {
        question: 'Can I set it up in opencode.json instead?',
        answer:
          "Yes. Add AgentInbox as a remote MCP server with the URL `https://mcp.agentinbox.md`, in the project's `opencode.json` or in `~/.config/opencode/opencode.json` for every project. Then run `opencode mcp auth AgentInbox`.",
      },
      {
        question: 'Do I need an API key?',
        answer: 'No. You sign in to Agent Inbox in your browser and approve OpenCode. OpenCode never sees an API key.',
      },
      {
        question: 'What are the tools called in OpenCode?',
        answer: "They have the server's name in front, such as `AgentInbox_inbox_send` and `AgentInbox_inbox_list`.",
      },
    ],
    cta: 'opencode mcp add AgentInbox --url https://mcp.agentinbox.md',
  },
  cursor: {
    metaTitle: 'Connect Cursor to Email | Agent Inbox',
    metaDescription:
      "Give Cursor's agent its own email address. Add Agent Inbox in one click and it can ask you, wait for your reply, and report back by email.",
    intro: "Cursor's agent can email you when it needs a decision, so you can answer without opening the editor.",
    hero: CURSOR_JSON,
    heroAlt: "An email from Cursor's agent asking which approach to take",
    benefitsHeading: AUTONOMOUS,
    benefitsIntro: "Let Cursor's agent ask instead of guessing.",
    benefits: [
      {
        title: 'Ask instead of guessing',
        description: "When a task is unclear, Cursor's agent emails you the question.",
      },
      { title: 'Approve before it acts', description: "Changes you'd want to review wait for your Approve." },
      {
        title: 'One click to add',
        description: 'The Add to Cursor button on agentinbox.md sets up the server for you.',
      },
    ],
    setupIntro: "Add the Agent Inbox MCP server to Cursor, then sign in the first time it's used.",
    steps: [
      {
        title: 'Add Agent Inbox',
        description: 'Click Add to Cursor on agentinbox.md, or install Agent Inbox from the Cursor Marketplace.',
      },
      {
        title: 'Or edit mcp.json',
        description: 'Add the server to `~/.cursor/mcp.json` yourself.',
        code: CURSOR_JSON,
      },
      { title: 'Sign in', description: 'The first time Cursor uses the inbox, it opens the sign-in window.' },
      {
        title: 'Try it',
        description: "Ask Cursor's agent to email you.",
        code: 'Email me when the migration script is ready to run.',
      },
    ],
    prompts: [
      {
        prompt: 'Email me before you change anything in the payments module.',
        result: "Cursor's agent waits for your Approve before it edits those files.",
      },
      {
        prompt: 'If the spec is unclear, email me your question and wait.',
        result: 'You reply with the answer, and the agent carries on.',
      },
      {
        prompt: "Email me a summary of the changes when you're done.",
        result: 'A tell message, with no reply needed.',
      },
    ],
    faq: [
      {
        question: 'Is there a Cursor plugin?',
        answer:
          'Yes. Agent Inbox is in the Cursor Marketplace, with the Agent Inbox skills and the MCP server in one install.',
      },
      {
        question: 'What if Cursor stops before I reply?',
        answer: 'Your answer stays in the conversation. The next session can read it and pick up from there.',
      },
      {
        question: "Where do I find my agent's email address?",
        answer: "Ask Cursor's agent for your Agent Inbox address, or check agentinbox.md.",
      },
    ],
    cta: CURSOR_JSON,
  },
  hermes: {
    metaTitle: 'Connect Hermes to Email | Agent Inbox',
    metaDescription:
      'Give Hermes its own email address. It reports back, asks before it acts, and gets mail from people and services wherever it runs.',
    intro:
      'Hermes runs on its own, often on a server. Agent Inbox gives it an address to email you from and to receive mail at.',
    hero: 'hermes mcp add AgentInbox --url https://mcp.agentinbox.md --auth oauth',
    heroAlt: 'An email from Hermes with the summary of an overnight research run',
    benefitsHeading: AUTONOMOUS,
    benefitsIntro: "Hermes keeps working while you're away. Now it can check in too.",
    benefits: [
      { title: 'Reports from wherever it runs', description: 'Long jobs on a server end with an email to you.' },
      { title: 'Approve before it acts', description: "Anything you'd want a say in waits for your click." },
      {
        title: 'Mail for its own accounts',
        description: 'Sign-up links and verification codes go to its address, not yours.',
      },
    ],
    setupIntro: 'Install the skills once for all projects, then add the MCP server on the computer Hermes runs on.',
    steps: [
      {
        title: 'Install the skills',
        description: 'Into `~/.hermes/skills`, once for every project.',
        code: 'npx skills add agentinboxhq/skills -g --agent hermes-agent -y',
      },
      {
        title: 'Add the MCP server',
        description: 'It opens the sign-in, then asks to enable the tools. Answer yes.',
        code: 'hermes mcp add AgentInbox --url https://mcp.agentinbox.md --auth oauth',
      },
      { title: 'Reload', description: 'Run it in an open session, or start a new one.', code: '/reload-mcp' },
      { title: 'Test it', description: 'Connects and lists the inbox tools.', code: 'hermes mcp test AgentInbox' },
    ],
    prompts: [
      {
        prompt: 'When the overnight research run finishes, email me the summary.',
        result: 'A tell message waiting in your inbox in the morning.',
      },
      {
        prompt: 'Sign up for the trial and use the code from your inbox.',
        result: 'Hermes reads the verification email at its own address.',
      },
      { prompt: 'Ask me by email before you spend anything.', result: 'Every purchase waits for your Approve.' },
    ],
    faq: [
      {
        question: 'What if Hermes runs on a server with no browser?',
        answer:
          "Hermes prints the sign-in link instead. Open it on any device, approve, then paste the address your browser ends on at Hermes's prompt.",
      },
      {
        question: 'Can Hermes run the setup itself?',
        answer:
          'No. Adding the server waits for a person at the terminal, so run the command yourself on the computer where Hermes runs.',
      },
      {
        question: 'Can I add it to config.yaml instead?',
        answer:
          'Yes. Add AgentInbox under `mcp_servers` in `~/.hermes/config.yaml` with the URL `https://mcp.agentinbox.md` and `auth: oauth`, then sign in with `hermes mcp login AgentInbox`.',
      },
    ],
    cta: 'hermes mcp add AgentInbox --url https://mcp.agentinbox.md --auth oauth',
  },
  openclaw: {
    metaTitle: 'Connect OpenClaw to Email | Agent Inbox',
    metaDescription:
      'Give OpenClaw its own email address. Your assistant asks before it acts, handles its own sign-ups, and emails you when a task is done.',
    intro:
      'OpenClaw runs errands for you. With its own address, it can email you for decisions and receive mail for the accounts it manages.',
    hero: 'npx @agentinbox/cli setup email',
    heroAlt: 'An email from OpenClaw asking for approval to pay an invoice',
    benefitsHeading: AUTONOMOUS,
    benefitsIntro: 'A personal assistant that checks with you, by email.',
    benefits: [
      { title: 'Approve before it pays', description: 'Invoices, bookings and purchases wait for your click.' },
      {
        title: 'An address for its errands',
        description: 'Bookings, sign-ups and verification codes go to its inbox, not yours.',
      },
      { title: 'Hear back without checking in', description: 'OpenClaw emails you when a task is done or stuck.' },
    ],
    setupIntro: 'Create the address with the CLI, then add the skills so OpenClaw knows how to use it.',
    steps: [
      {
        title: 'Install the CLI',
        description: 'Install it once, or use `npx @agentinbox/cli`.',
        code: '$ npm i -g @agentinbox/cli',
        output: INSTALL_OUTPUT,
      },
      {
        title: 'Create and claim the address',
        description: 'Create the address, then run login and approve it in the browser to enable outbound email.',
        code: '$ agentinbox setup email\n$ agentinbox login',
      },
      {
        title: 'Add the skill to OpenClaw',
        description: 'Into `~/.openclaw/skills`. A new session picks it up.',
        code: '$ npx skills add agentinboxhq/skills -g --agent openclaw -y',
      },
      {
        title: 'Try it',
        description: 'Ask OpenClaw to email you.',
        code: "Email me when you've found three hotel options.",
      },
    ],
    prompts: [
      {
        prompt: 'Before you pay any invoice over $500, email me for approval.',
        result: 'OpenClaw sends Approve and Deny buttons and waits.',
      },
      {
        prompt: 'Find a table for two on Friday and email me the options.',
        result: 'You pick one, and OpenClaw books it.',
      },
      {
        prompt: 'Sign up for the newsletter and confirm it from your own inbox.',
        result: "The confirmation email goes to OpenClaw's address.",
      },
    ],
    faq: [
      {
        question: 'Do I need an account to start?',
        answer:
          "No. Setup without an account gives you a free demo with 5 messages. Its inbox receives email but can't send any until you log in with `npx @agentinbox/cli login`.",
      },
      {
        question: 'Can OpenClaw email people other than me?',
        answer:
          "Yes, once they're contacts. Invite them by email and they confirm once. OpenClaw can reply to strangers who write first, but it can't email them first.",
      },
      {
        question: 'Where does OpenClaw keep the skills?',
        answer: 'In `~/.openclaw/skills` in your home directory, so one install works for every project.',
      },
    ],
    cta: 'npx @agentinbox/cli setup email',
  },
  claude: {
    metaTitle: 'Connect Claude to Email | Agent Inbox',
    metaDescription:
      'Add Agent Inbox to Claude as a custom connector. Claude gets its own email address to message people, ask questions and bring back the answers.',
    intro:
      'Add Agent Inbox to Claude as a connector, and Claude can email people from the chat and bring their answers back into the conversation.',
    hero: MCP_URL,
    heroAlt: "A Claude chat showing a teammate's emailed answer to a question",
    benefitsHeading: FROM_THE_CHAT,
    benefitsIntro: 'Claude can now reach people outside the chat window.',
    benefits: [
      {
        title: 'Ask someone without leaving the chat',
        description: 'Claude emails your contact and shows you the answer when it arrives.',
      },
      {
        title: 'Set up from the chat',
        description: 'Claude creates your agent and its address with you, step by step.',
      },
      {
        title: 'No key to paste',
        description: 'You sign in to Agent Inbox and approve Claude. Claude never sees an API key.',
      },
    ],
    setupIntro: 'Add Agent Inbox as a custom connector on claude.ai or in the desktop app.',
    steps: [
      {
        title: 'Open connectors',
        description: 'In Claude, open Settings › Connectors and choose Add custom connector.',
      },
      { title: 'Paste the address', description: 'Use this as the connector URL.', code: MCP_URL },
      { title: 'Connect', description: 'Click Connect, sign in to Agent Inbox and approve.' },
      {
        title: 'Finish setup in the chat',
        description: 'Claude asks what to call your agent and which address it gets.',
        code: 'Set up my Agent Inbox.',
      },
    ],
    prompts: [
      {
        prompt: 'Email Sam and ask which day works for the review, then tell me.',
        result: 'Claude emails Sam and shows you his answer in the chat.',
      },
      {
        prompt: 'Check my Agent Inbox for unread email and summarize it.',
        result: 'Claude reads the inbox and gives you the short version.',
      },
      {
        prompt: 'Ask Maya to approve the budget before I send it.',
        result: 'Maya gets Approve and Deny buttons. Claude tells you what she chose.',
      },
    ],
    faq: [
      {
        question: 'Does Claude keep waiting if the answer takes hours?',
        answer:
          "Claude waits a short while in the chat. If the answer hasn't come yet, ask Claude to check again later. The question stays open until it's answered or it expires.",
      },
      {
        question: 'Can I add Telegram or Slack from Claude?',
        answer:
          'Yes. Ask Claude to add Telegram or Slack and it gives you a link to finish in your browser. You never paste a token into the chat.',
      },
      {
        question: 'Does this work in the Claude desktop app?',
        answer: 'Yes. Custom connectors work on claude.ai and in the desktop app.',
      },
    ],
    cta: MCP_URL,
  },
  chatgpt: {
    metaTitle: 'Connect ChatGPT to Email | Agent Inbox',
    metaDescription:
      'Add Agent Inbox to ChatGPT as a connector. ChatGPT gets its own email address to message people and bring their answers back to the chat.',
    intro: 'Add Agent Inbox to ChatGPT, and it can email people for you, then show you what they said.',
    hero: MCP_URL,
    heroAlt: "A ChatGPT conversation summarizing the unread email in an agent's inbox",
    benefitsHeading: FROM_THE_CHAT,
    benefitsIntro: 'ChatGPT can reach people now, not only answer you.',
    benefits: [
      { title: 'Email people from the chat', description: 'ChatGPT emails a contact and shows you the reply.' },
      { title: "Read your agent's inbox", description: 'Ask what came in overnight and ChatGPT summarizes it.' },
      { title: 'Sign in, no key', description: 'You approve ChatGPT in an Agent Inbox sign-in window.' },
    ],
    setupIntro: 'Add Agent Inbox as a connector in developer mode.',
    steps: [
      {
        title: 'Turn on developer mode',
        description: 'Open Settings › Apps & Connectors › Advanced and switch on Developer mode.',
      },
      { title: 'Create the connector', description: 'Create a connector with this address.', code: MCP_URL },
      {
        title: 'Sign in',
        description: 'ChatGPT opens a sign-in window. Sign in to Agent Inbox and approve.',
      },
      {
        title: 'Try it',
        description: 'Ask ChatGPT to read your inbox.',
        code: 'List my unread Agent Inbox conversations.',
      },
    ],
    prompts: [
      {
        prompt: 'Ask Priya by email whether the venue is confirmed, and tell me her answer.',
        result: 'ChatGPT emails Priya and reports back in the chat.',
      },
      {
        prompt: "Summarize what's in my Agent Inbox today.",
        result: 'A short list of who wrote and what they need.',
      },
      {
        prompt: 'Email Sam the agenda and ask him to approve it.',
        result: 'Sam gets Approve and Deny buttons in the email.',
      },
    ],
    faq: [
      {
        question: 'Why do I need developer mode?',
        answer:
          'ChatGPT adds custom connectors through developer mode. Switch it on once in Settings › Apps & Connectors › Advanced, then create the connector.',
      },
      {
        question: 'Can ChatGPT set up my agent?',
        answer:
          "Yes. If your account has no agent yet, ChatGPT asks you for the agent's name and address, then sends a confirmation link to your email.",
      },
      {
        question: 'What happens if the reply comes after the chat moves on?',
        answer:
          'The answer is saved in the conversation. Ask ChatGPT to check your Agent Inbox and it reads the reply.',
      },
    ],
    cta: MCP_URL,
  },
  'grok-bot': {
    metaTitle: 'Connect Grok Bot to Email | Agent Inbox',
    metaDescription:
      'Connect Grok Bot to Agent Inbox and give it its own email address. It asks you before it acts, waits for your answer, and reports back.',
    intro: 'Give Grok Bot one address, or one prompt, and it gets its own email inbox to reach you from.',
    hero: GROK_PROMPT,
    heroAlt: 'An email from Grok Bot asking for approval before it acts',
    benefitsHeading: AUTONOMOUS,
    benefitsIntro: 'Grok Bot does the work. You keep the final say.',
    benefits: [
      { title: 'Approve before it acts', description: 'Anything hard to undo waits for your click in an email.' },
      { title: 'Hear back by email', description: 'Grok Bot emails you when a task is done or needs you.' },
      {
        title: 'Set up with one prompt',
        description: 'Point Grok Bot at the setup instructions and it does the rest.',
      },
    ],
    setupIntro: 'Add the MCP server, or let Grok Bot set itself up from one prompt.',
    steps: [
      {
        title: 'Add Agent Inbox',
        description: 'Add the Agent Inbox MCP server in Grok Bot with this address.',
        code: MCP_URL,
      },
      {
        title: 'Or ask Grok Bot to do it',
        description: 'Paste this prompt, and Grok Bot sets up Agent Inbox from the instructions.',
        code: GROK_PROMPT,
      },
      { title: 'Sign in', description: 'Sign in to Agent Inbox when asked, and approve the connection.' },
      {
        title: 'Try it',
        description: 'Ask Grok Bot to email you.',
        code: "Email me when you've finished the report.",
      },
    ],
    prompts: [
      { prompt: 'Ask me by email before you send anything on my behalf.', result: 'Grok Bot waits for your Approve.' },
      {
        prompt: 'Email me the three best options and let me pick.',
        result: 'You choose one, and Grok Bot carries on.',
      },
      { prompt: 'Email me when the report is ready.', result: 'A tell message, with no reply needed.' },
    ],
    faq: [
      {
        question: 'How do I add Agent Inbox to Grok Bot?',
        answer:
          'Add `https://mcp.agentinbox.md` as an MCP server, or paste "Set up Agent Inbox from https://www.agentinbox.md/agents.md" and Grok Bot follows the setup instructions.',
      },
      {
        question: 'Do I need an API key?',
        answer:
          'No. You sign in to Agent Inbox in your browser and approve the connection. Grok Bot never sees an API key.',
      },
      {
        question: 'Can Grok Bot email people other than me?',
        answer: "Yes, once they're contacts. It can reply to strangers who write first, but it can't email them first.",
      },
    ],
    cta: GROK_PROMPT,
  },
  'any-agent': {
    metaTitle: 'Connect Any AI Agent to Email | Agent Inbox',
    metaDescription:
      'Give any AI agent or script its own email address with the Agent Inbox CLI or MCP server. It asks, waits for the answer, and acts on it.',
    intro: 'If your agent can run a shell command or connect to an MCP server, it can have its own email address.',
    hero: 'npx @agentinbox/cli setup email',
    heroAlt: 'A shell script waiting for an emailed approval before it continues',
    benefitsHeading: AUTONOMOUS,
    benefitsIntro: 'Two ways in, and one inbox behind both.',
    benefits: [
      {
        title: 'Works from a shell',
        description: 'Scripts, cron jobs and CI steps call the CLI and read the exit code.',
      },
      {
        title: 'Works over MCP',
        description: 'Any client that supports remote MCP with OAuth sign-in connects to `https://mcp.agentinbox.md`.',
      },
      {
        title: 'Skills for coding agents',
        description: 'Agents that read Agent Skills learn when to reach you and how to read the answer.',
      },
    ],
    setupIntro: 'Set up with the CLI, then ask from code, or connect over MCP instead.',
    steps: [
      {
        title: 'Install the CLI',
        description: 'Install it once, or use `npx @agentinbox/cli`.',
        code: '$ npm i -g @agentinbox/cli',
      },
      {
        title: 'Create and claim the address',
        description: 'Create the address, then run login and approve it in the browser to enable outbound email.',
        code: '$ agentinbox setup email\n$ agentinbox login',
      },
      {
        title: 'Ask from your code',
        description: 'The command waits for the answer. The exit code tells you what it was.',
        code: '$ agentinbox send approve "Delete 342 stale rows?" && ./cleanup.sh',
      },
      {
        title: 'Or connect over MCP',
        description: 'Add this server to any remote MCP client, with no headers or key.',
        code: MCP_URL,
      },
    ],
    prompts: [
      {
        prompt: 'Ask me by email before the nightly job deletes old records.',
        result: 'The job waits for your Approve. A Deny stops it.',
      },
      {
        prompt: 'Email me which region to deploy to, with the options as choices.',
        result: 'You pick one, and your agent gets its id.',
      },
      { prompt: 'Email me if the backup fails.', result: 'A tell message, sent only when it matters.' },
    ],
    faq: [
      {
        question: 'How does my script know the answer?',
        answer:
          'From the exit code: 0 approved or answered, 10 denied, 11 the wait ran out with the question still open, 12 expired, 1 an error. Add `--json` for the full result.',
      },
      {
        question: 'Can I use it in CI?',
        answer:
          'Yes. Connect the CI job with a one-time code from agentinbox.md, or give it the `INBOX_SECRET_KEY` environment variable.',
      },
      {
        question: 'Which agents read the skills?',
        answer:
          'Any agent that follows the Agent Skills format, including Claude Code, Codex, OpenCode, Cursor, GitHub Copilot, Gemini CLI, Hermes and OpenClaw. Install them with `npx skills add agentinboxhq/skills`.',
      },
    ],
    cta: 'npx @agentinbox/cli setup email',
  },
};

const TELEGRAM_AGENTS: Record<AgentId, AgentPage> = {
  'claude-code': {
    metaTitle: 'Connect Claude Code to Telegram | Agent Inbox',
    metaDescription:
      'Connect Claude Code to Telegram. Approve its changes with a tap, and send it a message from your phone to start work in your project.',
    intro:
      'Claude Code gets its own Telegram bot. Approve its changes with a tap, and with `listen`, send it a message from your phone to start a task in your project.',
    hero: 'npx @agentinbox/cli setup telegram',
    heroAlt: 'A Telegram chat where Claude Code asks permission to run a command, with Allow and Deny buttons',
    benefitsHeading: AUTONOMOUS,
    benefitsIntro: "Your project keeps moving while you're away from your desk.",
    benefits: [
      {
        title: 'Start tasks from your phone',
        description: 'With `listen`, a Telegram message starts Claude Code in your project.',
      },
      {
        title: 'Permissions in your pocket',
        description: 'When Claude Code needs a permission during a run, you get Allow and Deny in Telegram.',
      },
      { title: 'Tap to approve', description: 'Migrations, pushes and deploys wait for one tap.' },
    ],
    setupIntro: 'Connect Telegram with the CLI, add the skills, then turn on `listen` in your project.',
    steps: [
      {
        title: 'Connect Telegram',
        description: 'Create a bot with @BotFather, paste the token, then tap Start in Telegram.',
        code: '$ npx @agentinbox/cli setup telegram',
      },
      {
        title: 'Keep it in your account',
        description: 'Log in so your setup and its channels move into your Agent Inbox account.',
        code: '$ npx @agentinbox/cli login',
      },
      {
        title: 'Add the skills',
        description: 'They teach Claude Code when to reach you.',
        code: '$ npx skills add agentinboxhq/skills --agent claude-code',
      },
      {
        title: 'Listen in your project',
        description: 'Run it in the project folder. Your messages now start Claude Code there.',
        code: '$ npx @agentinbox/cli listen claude-code',
      },
    ],
    prompts: [
      {
        prompt: 'Fix the failing test in auth and open a PR.',
        note: '(sent from Telegram)',
        result: "With `listen` on, this starts Claude Code in your project. It replies in Telegram when it's done.",
      },
      {
        prompt: 'Ask me on Telegram before you push to main.',
        result: 'Approve and Deny buttons in your chat. Nothing is pushed until you tap.',
      },
      {
        prompt: 'Give me the two options for the cache fix as buttons.',
        result: 'You pick one, and Claude Code carries on with it.',
      },
    ],
    faq: [
      {
        question: 'Whose messages start Claude Code?',
        answer:
          "Yours, and those of any contact you turn on Listen to for on agentinbox.md. A stranger's message never starts a run.",
      },
      {
        question: 'Where does Claude Code run?',
        answer:
          "On your computer, in the folder where you ran `listen`. It runs in the background: as a login item on macOS, a systemd user service on Linux, and inside WSL on Windows. `npx @agentinbox/cli listen status` shows where it's listening.",
      },
      {
        question: 'Can I use the Claude Code plugin instead?',
        answer:
          'Yes. The plugin adds the skills and the MCP server, and Claude Code can add Telegram for you with a link. `listen` still needs the CLI logged in on that computer.',
      },
    ],
    cta: 'npx @agentinbox/cli setup telegram',
  },
  codex: {
    metaTitle: 'Connect Codex to Telegram | Agent Inbox',
    metaDescription:
      "Connect Codex to Telegram. It asks you on your phone when it's stuck or about to ship, and keeps going after you tap.",
    intro:
      'Codex works through long tasks. With a Telegram bot, it can ask you something on your phone and keep going after you tap.',
    hero: 'codex plugin marketplace add agentinboxhq/skills',
    heroAlt: 'Codex asking on Telegram which of two failing tests is correct, with two buttons',
    benefitsHeading: AUTONOMOUS,
    benefitsIntro: "Codex doesn't sit waiting for you at the terminal.",
    benefits: [
      { title: 'Unblock it from anywhere', description: 'A question on your phone beats a task stuck at a prompt.' },
      { title: 'Tap instead of typing', description: 'Approvals and choices are buttons in the chat.' },
      {
        title: 'One conversation per task',
        description: "Each task keeps its own conversation, so answers don't get mixed up.",
      },
    ],
    setupIntro: 'Install the plugin, sign in, then let Codex walk you through adding Telegram.',
    steps: [
      {
        title: 'Install the plugin',
        description: 'Adds the MCP server and the Agent Inbox skills.',
        code: 'codex plugin marketplace add agentinboxhq/skills\ncodex plugin add agentinbox@agentinbox',
      },
      {
        title: 'Sign in',
        description: 'Opens the Agent Inbox sign-in in your browser.',
        code: 'codex mcp login AgentInbox',
      },
      {
        title: 'Add Telegram',
        description: 'Codex gives you a link. Create your bot with @BotFather there and tap Start.',
        code: 'Add Telegram to my Agent Inbox.',
      },
      {
        title: 'Try it',
        description: 'Ask Codex to message you.',
        code: 'Message me on Telegram when the tests pass.',
      },
    ],
    prompts: [
      {
        prompt: 'Message me on Telegram before you run the data backfill.',
        result: 'Codex waits for your Approve.',
      },
      {
        prompt: 'If two tests contradict each other, ask me which one is right.',
        result: 'You get both as buttons and tap one.',
      },
      {
        prompt: 'Ping me on Telegram when the PR is ready for review.',
        result: 'A tell message with the PR summary.',
      },
    ],
    faq: [
      {
        question: 'Do I paste my bot token into Codex?',
        answer:
          'No. Codex gives you a link to the setup page, and you paste the token there. It never passes through the chat.',
      },
      {
        question: 'Can Codex message my teammates on Telegram?',
        answer:
          "Yes, once they're contacts. Invite them and they get a link that opens your bot. With the Agent Inbox skills, Codex asks you first before it reaches anyone other than you.",
      },
      {
        question: 'How does the plugin stay up to date?',
        answer:
          'Codex checks the marketplace each time it starts and updates the plugin. `codex plugin marketplace upgrade agentinbox` does it right away.',
      },
    ],
    cta: 'codex plugin marketplace add agentinboxhq/skills',
  },
  opencode: {
    metaTitle: 'Connect OpenCode to Telegram | Agent Inbox',
    metaDescription:
      'Connect OpenCode to Telegram with the Agent Inbox MCP server. It asks you from the terminal, and you answer from your phone.',
    intro: 'OpenCode stays in the terminal. Your answers can come from your phone.',
    hero: 'opencode mcp add AgentInbox --url https://mcp.agentinbox.md --global',
    heroAlt: 'OpenCode asking on Telegram whether to rewrite a folder, with Approve and Deny buttons',
    benefitsHeading: AUTONOMOUS,
    benefitsIntro: 'Start a task, leave your desk, and answer when OpenCode asks.',
    benefits: [
      {
        title: 'Answer from your phone',
        description: "OpenCode's questions arrive in Telegram instead of waiting at a prompt.",
      },
      { title: 'Approve before it acts', description: 'Big rewrites and deletes wait for your tap.' },
      { title: 'A bot only you control', description: 'You create it with @BotFather. Nobody else owns it.' },
    ],
    setupIntro: 'Add the MCP server for every project, sign in, and add Telegram from OpenCode.',
    steps: [
      {
        title: 'Add the MCP server',
        description: '`--global` adds it for every project. Leave it out for this project only.',
        code: 'opencode mcp add AgentInbox --url https://mcp.agentinbox.md --global',
      },
      {
        title: 'Sign in',
        description: 'Sign in to Agent Inbox in your browser.',
        code: 'opencode mcp auth AgentInbox',
      },
      {
        title: 'Add Telegram',
        description: 'OpenCode gives you a link. Create your bot with @BotFather there and tap Start.',
        code: 'Add Telegram to my Agent Inbox.',
      },
      {
        title: 'Add the skills',
        description: 'They teach OpenCode when to reach you.',
        code: 'npx skills add agentinboxhq/skills',
      },
    ],
    prompts: [
      {
        prompt: 'Ask me on Telegram before you rewrite the migrations folder.',
        result: 'Nothing changes until you tap Approve.',
      },
      { prompt: 'Send me the failing test names on Telegram.', result: 'A tell message you can read on the go.' },
      {
        prompt: 'Give me three names for the new module as buttons.',
        result: 'You tap one, and OpenCode uses it.',
      },
    ],
    faq: [
      {
        question: 'Do I need the CLI too?',
        answer:
          'No. The MCP server gives OpenCode the inbox tools, and OpenCode can add Telegram for you with a link. The CLI is only for scripts and terminals.',
      },
      {
        question: "How do I check that it's signed in?",
        answer: 'Run `opencode mcp list`. It shows whether Agent Inbox is signed in.',
      },
      {
        question: "What if I don't see the message for a while?",
        answer:
          'The question stays open until you answer or it expires: 24 hours by default, up to 5 days. OpenCode gets an expired result if it runs out.',
      },
    ],
    cta: 'opencode mcp add AgentInbox --url https://mcp.agentinbox.md --global',
  },
  cursor: {
    metaTitle: 'Connect Cursor to Telegram | Agent Inbox',
    metaDescription:
      'Connect Cursor to Telegram. Its agent asks you on your phone instead of stalling, and you answer with a tap.',
    intro:
      "Cursor's agent can ask you on Telegram, so a question doesn't stall the task while you're away from your desk.",
    hero: CURSOR_JSON,
    heroAlt: "Cursor's agent offering three layout options as buttons in Telegram",
    benefitsHeading: AUTONOMOUS,
    benefitsIntro: "Cursor's agent keeps working, and its questions find you.",
    benefits: [
      {
        title: 'Questions follow you',
        description: "The agent's questions land on your phone, not in an editor you closed.",
      },
      { title: 'Tap to approve', description: 'Deletes and big refactors wait for one tap.' },
      {
        title: 'Shared with your other agents',
        description: 'The bot belongs to your agent in Agent Inbox, so your other tools use it too.',
      },
    ],
    setupIntro: "Add the MCP server, sign in, then ask Cursor's agent to add Telegram.",
    steps: [
      {
        title: 'Add Agent Inbox',
        description: 'Click Add to Cursor on agentinbox.md, or add the server to `~/.cursor/mcp.json`.',
        code: CURSOR_JSON,
      },
      { title: 'Sign in', description: 'The first time Cursor uses the inbox, it opens the sign-in window.' },
      {
        title: 'Add Telegram',
        description: "Cursor's agent gives you a link. Create your bot with @BotFather there and tap Start.",
        code: 'Add Telegram to my Agent Inbox.',
      },
      {
        title: 'Try it',
        description: 'Ask the agent to message you.',
        code: 'Message me on Telegram if the build breaks.',
      },
    ],
    prompts: [
      {
        prompt: 'Ask me on Telegram before you delete the old components.',
        result: 'The agent waits for your Approve.',
      },
      {
        prompt: 'Message me on Telegram if the build breaks.',
        result: 'A tell message only when something fails.',
      },
      {
        prompt: 'Give me the three layout options as buttons on Telegram.',
        result: 'You tap one, and the agent builds it.',
      },
    ],
    faq: [
      {
        question: 'Does Cursor have to stay open while I answer?',
        answer:
          'The agent waits while it runs. If it stops first, your answer stays in the conversation for the next session to read.',
      },
      {
        question: 'Can I use both mcp.json and the Cursor plugin?',
        answer: 'Use one. Adding the server twice makes every tool show up twice.',
      },
      {
        question: 'Can the same bot serve my other agents?',
        answer:
          'Yes. The bot belongs to your agent in Agent Inbox, not to Cursor. Connect Claude Code or Codex to the same account and they reach you through the same bot.',
      },
    ],
    cta: CURSOR_JSON,
  },
  hermes: {
    metaTitle: 'Connect Hermes to Telegram | Agent Inbox',
    metaDescription:
      'Connect Hermes to Telegram with Agent Inbox. It messages you and your team, asks before it acts, and takes your answer with a tap.',
    intro:
      'Hermes is built to run on its own. With Agent Inbox on Telegram, it can ask you and your team for decisions and take the answer with a tap.',
    hero: 'hermes mcp add AgentInbox --url https://mcp.agentinbox.md --auth oauth',
    heroAlt: 'Hermes asking a teammate on Telegram whether staging is back up',
    benefitsHeading: AUTONOMOUS,
    benefitsIntro: 'Hermes keeps running. You keep the decisions.',
    benefits: [
      { title: 'Check-ins from the server', description: 'Hermes messages you from wherever it runs.' },
      { title: 'Approve before it acts', description: 'Publishing, spending and deleting wait for your tap.' },
      { title: 'Your team in the loop', description: 'Invite teammates as contacts, and Hermes can ask them too.' },
    ],
    setupIntro: "Install the skills, add the MCP server on Hermes's computer, then add Telegram from Hermes.",
    steps: [
      {
        title: 'Install the skills',
        description: 'Into `~/.hermes/skills`, once for every project.',
        code: 'npx skills add agentinboxhq/skills -g --agent hermes-agent -y',
      },
      {
        title: 'Add the MCP server',
        description: 'Run it on the computer Hermes runs on, and answer yes to enable the tools.',
        code: 'hermes mcp add AgentInbox --url https://mcp.agentinbox.md --auth oauth',
      },
      {
        title: 'Reload',
        description: 'Load the new tools in an open session, or start a new one.',
        code: '/reload-mcp',
      },
      {
        title: 'Add Telegram',
        description: 'Hermes gives you a link. Create your bot with @BotFather there and tap Start.',
        code: 'Add Telegram to my Agent Inbox.',
      },
    ],
    prompts: [
      {
        prompt: 'Message me on Telegram before you publish the weekly report.',
        result: 'Approve and Deny buttons in your chat.',
      },
      { prompt: 'Ask Ana on Telegram whether staging is back up.', result: 'Hermes asks Ana and uses her answer.' },
      { prompt: 'Tell me on Telegram when the crawl finishes.', result: 'A tell message, with no reply needed.' },
    ],
    faq: [
      {
        question: 'Which Telegram bot does Hermes use?',
        answer:
          'A private bot you create with @BotFather and connect to Agent Inbox. Hermes reaches you and your contacts through it with the inbox tools.',
      },
      {
        question: 'Can I set it up over SSH?',
        answer:
          "Yes. On a computer without a browser, Hermes prints the sign-in link. Open it on any device, approve, then paste the address your browser ends on at Hermes's prompt.",
      },
      {
        question: 'How do I check the tools loaded?',
        answer: 'Run `hermes mcp test AgentInbox`. It connects and lists the inbox tools.',
      },
    ],
    cta: 'hermes mcp add AgentInbox --url https://mcp.agentinbox.md --auth oauth',
  },
  openclaw: {
    metaTitle: 'Connect OpenClaw to Telegram | Agent Inbox',
    metaDescription:
      'Connect OpenClaw to Telegram. Your assistant asks before it pays, books or sends anything, and you answer with a tap.',
    intro:
      'OpenClaw runs your errands. On Telegram, it asks before it pays, books or sends anything, and you answer with a tap.',
    hero: 'npx @agentinbox/cli setup telegram',
    heroAlt: 'OpenClaw asking on Telegram to approve an invoice payment, with Approve and Deny buttons',
    benefitsHeading: AUTONOMOUS,
    benefitsIntro: 'Your assistant does the legwork and checks with you on the decisions.',
    benefits: [
      { title: 'Approve before it acts', description: 'Payments, bookings and messages to others wait for your tap.' },
      { title: 'Hear back without checking in', description: 'OpenClaw tells you when a task is done or stuck.' },
      {
        title: 'One conversation per task',
        description: 'Each errand keeps its own conversation, so answers land in the right place.',
      },
    ],
    setupIntro: 'Connect your Telegram bot with the CLI, then add the skill so OpenClaw knows how to reach you.',
    steps: [
      {
        title: 'Install the CLI',
        description: 'Install it once, or use `npx @agentinbox/cli`.',
        code: '$ npm i -g @agentinbox/cli',
        output: INSTALL_OUTPUT,
      },
      {
        title: 'Connect Telegram',
        description: 'Create a bot with @BotFather, paste its token, then tap Start in Telegram.',
        code: '$ agentinbox setup telegram',
      },
      {
        title: 'Add the skill to OpenClaw',
        description: 'Into `~/.openclaw/skills`. A new session picks it up.',
        code: '$ npx skills add agentinboxhq/skills -g --agent openclaw -y',
      },
      {
        title: 'Try it',
        description: 'Ask OpenClaw to message you.',
        code: "Message me on Telegram when you've found three hotel options.",
      },
    ],
    prompts: [
      {
        prompt: 'Before you pay any invoice over $500, ask me on Telegram.',
        result: 'OpenClaw waits for your Approve before it pays.',
      },
      {
        prompt: 'Find a table for two on Friday and let me pick.',
        result: 'The options arrive as buttons. Tap one, and OpenClaw books it.',
      },
      { prompt: 'Tell me when the nightly scrape finishes.', result: 'A tell message, with no reply needed.' },
    ],
    faq: [
      {
        question: 'Do I need a new Telegram bot?',
        answer:
          'Yes. Create a private bot with @BotFather during setup. Only you control it, and you paste its token in the terminal or on the setup page, never in a chat.',
      },
      {
        question: 'Can OpenClaw message my partner or my team?',
        answer:
          "Yes, once they're contacts. Invite them with `agentinbox contact invite` and they get a link that opens your bot.",
      },
      {
        question: "What if I'm asleep when it asks?",
        answer:
          "The question waits: 24 hours by default, and up to 5 days with `--ttl`. If it expires, OpenClaw gets that result and doesn't act.",
      },
    ],
    cta: 'npx @agentinbox/cli setup telegram',
  },
  claude: {
    metaTitle: 'Connect Claude to Telegram | Agent Inbox',
    metaDescription:
      'Add Agent Inbox to Claude and reach people on Telegram from the chat. Claude asks, waits, and brings their answers back.',
    intro:
      'Add Agent Inbox to Claude, and Claude can reach people on Telegram from the chat and bring back their answers.',
    hero: MCP_URL,
    heroAlt: "A Claude chat showing a teammate's Telegram answer about covering a shift",
    benefitsHeading: FROM_THE_CHAT,
    benefitsIntro: 'Claude can now ask people things, not only answer you.',
    benefits: [
      {
        title: 'Reach people on their phones',
        description: 'Claude messages your contacts on Telegram and waits for the reply.',
      },
      {
        title: 'Add Telegram from the chat',
        description: 'Ask Claude to add it, and it gives you the link to finish.',
      },
      { title: 'Read what came in', description: 'Ask Claude what people sent your agent today.' },
    ],
    setupIntro: 'Add Agent Inbox as a custom connector, then add Telegram from the chat.',
    steps: [
      {
        title: 'Add the connector',
        description: 'Open Settings › Connectors, choose Add custom connector, and paste the address.',
        code: MCP_URL,
      },
      { title: 'Connect and sign in', description: 'Click Connect, sign in to Agent Inbox and approve.' },
      {
        title: 'Add Telegram',
        description: 'Claude gives you a link. Create your bot with @BotFather there and tap Start.',
        code: 'Add Telegram to my Agent Inbox.',
      },
      {
        title: 'Try it',
        description: 'Ask Claude to reach someone.',
        code: "Ask Ana on Telegram if she can cover Friday's shift.",
      },
    ],
    prompts: [
      {
        prompt: "Ask Ana on Telegram if she can cover Friday's shift.",
        result: 'Claude messages Ana and shows you her answer.',
      },
      {
        prompt: 'What did people send my agent on Telegram today?',
        result: 'A short summary of each conversation.',
      },
      {
        prompt: 'Ask Sam on Telegram to pick a time: 10am, 2pm or 4pm.',
        result: 'Sam taps a button. Claude tells you which.',
      },
    ],
    faq: [
      {
        question: 'Does Claude see my bot token?',
        answer: 'No. You paste the token on the Agent Inbox setup page in your browser. It never goes into the chat.',
      },
      {
        question: 'Who can Claude message on Telegram?',
        answer:
          "Your contacts: you, and people who opened your bot through an invite link. Claude can reply to strangers who write first, but can't message them first.",
      },
      {
        question: 'Does Claude wait for the answer?',
        answer:
          "For a short while. If the answer hasn't come yet, ask Claude to check again later. The question stays open until it's answered or it expires.",
      },
    ],
    cta: MCP_URL,
  },
  chatgpt: {
    metaTitle: 'Connect ChatGPT to Telegram | Agent Inbox',
    metaDescription:
      'Add Agent Inbox to ChatGPT and message people on Telegram from the chat. ChatGPT asks, waits, and tells you what they said.',
    intro: 'Add Agent Inbox to ChatGPT, and it can message people on Telegram for you and tell you what they said.',
    hero: MCP_URL,
    heroAlt: "A ChatGPT conversation reporting a contact's Telegram reply about a delivery",
    benefitsHeading: FROM_THE_CHAT,
    benefitsIntro: 'ChatGPT can do the asking for you.',
    benefits: [
      { title: 'Ask on your behalf', description: 'ChatGPT messages a contact on Telegram and reports the answer.' },
      { title: "See who's waiting", description: 'Ask which conversations still need a reply.' },
      { title: 'Buttons for quick answers', description: 'Approvals and choices arrive as buttons your contact taps.' },
    ],
    setupIntro: 'Create the connector in developer mode, then add Telegram from the chat.',
    steps: [
      {
        title: 'Create the connector',
        description:
          'Switch on Developer mode in Settings › Apps & Connectors › Advanced, then create a connector with this address.',
        code: MCP_URL,
      },
      {
        title: 'Sign in',
        description: 'ChatGPT opens a sign-in window. Sign in to Agent Inbox and approve.',
      },
      {
        title: 'Add Telegram',
        description: 'ChatGPT gives you a link. Create your bot with @BotFather there and tap Start.',
        code: 'Add Telegram to my Agent Inbox.',
      },
      {
        title: 'Try it',
        description: 'Ask ChatGPT to message someone.',
        code: 'Message Priya on Telegram and ask if the delivery arrived.',
      },
    ],
    prompts: [
      {
        prompt: 'Message Priya on Telegram and ask if the delivery arrived.',
        result: 'ChatGPT asks Priya and tells you her answer.',
      },
      {
        prompt: "Read my Agent Inbox and tell me who's waiting on an answer.",
        result: 'A list of open conversations.',
      },
      { prompt: 'Ask Leo on Telegram to approve the refund.', result: 'Leo gets Approve and Deny buttons.' },
    ],
    faq: [
      {
        question: 'Why does ChatGPT need developer mode?',
        answer:
          'ChatGPT adds custom connectors through developer mode. Switch it on once, then create the connector with `https://mcp.agentinbox.md`.',
      },
      {
        question: 'Can my contacts answer in their own words?',
        answer: 'Yes. An ask question takes a typed reply. Approvals and choices use buttons.',
      },
      {
        question: 'Can ChatGPT add Telegram for me?',
        answer:
          'Yes. Ask it to add Telegram and it gives you a link. You create the bot and paste the token on that page, never in the chat.',
      },
    ],
    cta: MCP_URL,
  },
  'grok-bot': {
    metaTitle: 'Connect Grok Bot to Telegram | Agent Inbox',
    metaDescription:
      'Connect Grok Bot to Agent Inbox and Telegram. It asks you before it acts, and you answer with a tap on your phone.',
    intro: 'Connect Grok Bot to Agent Inbox, add Telegram, and it can ask you on your phone before it acts.',
    hero: GROK_PROMPT,
    heroAlt: 'Grok Bot asking on Telegram for approval, with Approve and Deny buttons',
    benefitsHeading: AUTONOMOUS,
    benefitsIntro: 'Grok Bot asks first. You answer with a tap.',
    benefits: [
      { title: 'Tap to approve', description: 'Anything hard to undo waits for one tap.' },
      { title: 'Questions on your phone', description: 'Grok Bot reaches you in Telegram, wherever you are.' },
      { title: 'A bot only you control', description: 'You create it with @BotFather and connect it once.' },
    ],
    setupIntro: 'Connect Agent Inbox with one address or one prompt, then add Telegram.',
    steps: [
      {
        title: 'Connect Agent Inbox',
        description: 'Add `https://mcp.agentinbox.md` as an MCP server in Grok Bot, or paste this prompt.',
        code: GROK_PROMPT,
      },
      { title: 'Sign in', description: 'Sign in to Agent Inbox when asked, and approve the connection.' },
      {
        title: 'Add Telegram',
        description: 'Grok Bot gives you a link. Create your bot with @BotFather there and tap Start.',
        code: 'Add Telegram to my Agent Inbox.',
      },
      {
        title: 'Try it',
        description: 'Ask Grok Bot to message you.',
        code: "Message me on Telegram when you're done.",
      },
    ],
    prompts: [
      { prompt: 'Ask me on Telegram before you post anything.', result: 'Grok Bot waits for your tap.' },
      { prompt: 'Send me the options on Telegram as buttons.', result: 'You tap one, and Grok Bot carries on.' },
      { prompt: "Message me on Telegram when you're done.", result: 'A tell message, with no reply needed.' },
    ],
    faq: [
      {
        question: 'Does Grok Bot see my bot token?',
        answer: 'No. You paste it on the Agent Inbox setup page in your browser.',
      },
      {
        question: 'What does the setup prompt do?',
        answer:
          'It points Grok Bot at https://www.agentinbox.md/agents.md, the setup instructions written for agents. Grok Bot follows them and connects to Agent Inbox.',
      },
      {
        question: "What if I don't answer in time?",
        answer:
          "The question expires after its time limit, 24 hours by default. Grok Bot gets that result and doesn't go ahead.",
      },
    ],
    cta: GROK_PROMPT,
  },
  'any-agent': {
    metaTitle: 'Connect Any AI Agent to Telegram | Agent Inbox',
    metaDescription:
      'Connect any AI agent or script to Telegram with the Agent Inbox CLI or MCP server. It asks on your phone and waits for your tap.',
    intro:
      'Any agent that can run a shell command or connect to an MCP server can message you on Telegram and wait for your answer.',
    hero: 'npx @agentinbox/cli setup telegram',
    heroAlt: 'A deploy script waiting for a tap on a Telegram approval',
    benefitsHeading: AUTONOMOUS,
    benefitsIntro: 'Put a person in any pipeline, one tap away.',
    benefits: [
      { title: 'A tap in your pipeline', description: 'A CI step or cron job waits for your Approve on Telegram.' },
      {
        title: 'Pick the channel per message',
        description: "`--via telegram` sends on Telegram even when a contact's default is email.",
      },
      {
        title: 'MCP for everything else',
        description: 'Any remote MCP client with OAuth sign-in connects to `https://mcp.agentinbox.md`.',
      },
    ],
    setupIntro: 'Connect Telegram with the CLI, then ask from your code.',
    steps: [
      {
        title: 'Install the CLI',
        description: 'Install it once, or use `npx @agentinbox/cli`.',
        code: '$ npm i -g @agentinbox/cli',
      },
      {
        title: 'Connect Telegram',
        description: 'Create a bot with @BotFather, paste its token, then tap Start.',
        code: '$ agentinbox setup telegram',
      },
      {
        title: 'Ask from your code',
        description: 'The command waits for your tap. The exit code says what you chose.',
        code: '$ agentinbox send approve "Rotate the API keys?" --via telegram && ./rotate.sh',
      },
      {
        title: 'Or connect over MCP',
        description: 'Add this server to any remote MCP client, with no headers or key.',
        code: MCP_URL,
      },
    ],
    prompts: [
      {
        prompt: 'Ask me on Telegram before the release job tags a new version.',
        result: 'The job waits for your tap.',
      },
      {
        prompt: 'Message me on Telegram if disk usage passes 90%.',
        result: 'A tell message, sent only when it matters.',
      },
      {
        prompt: 'Ask me on Telegram which backup to restore, with the dates as options.',
        result: 'You tap a date, and your agent gets its id.',
      },
    ],
    faq: [
      {
        question: 'Can my script carry on without blocking?',
        answer:
          'Yes. `--async` returns at once, and `--timeout` limits how long the command waits. On timeout it exits 11 and the question stays open.',
      },
      {
        question: "How do I send on Telegram when a contact's default is email?",
        answer: "Add `--via telegram` to `send`. It overrides the contact's default channel for that message.",
      },
      {
        question: 'Which agents can use the skills?',
        answer:
          'Any agent that reads the Agent Skills format, such as GitHub Copilot and Gemini CLI. Install them with `npx skills add agentinboxhq/skills`.',
      },
    ],
    cta: 'npx @agentinbox/cli setup telegram',
  },
};

const SLACK_AGENTS: Record<AgentId, AgentPage> = {
  'claude-code': {
    metaTitle: 'Connect Claude Code to Slack | Agent Inbox',
    metaDescription:
      'Let Claude Code ask you and your team on Slack before it acts, and start it from a Slack message with listen.',
    intro:
      'Let Claude Code ask you on Slack and wait for your answer. With `listen`, a Slack message from you starts it in your project.',
    hero: CLAUDE_PLUGIN,
    heroAlt: 'Claude Code asking in Slack to approve a production deploy, with Approve and Deny buttons',
    benefitsHeading: AUTONOMOUS,
    benefitsIntro: 'Claude Code reaches you where your team already works.',
    benefits: [
      { title: 'Approve before it acts', description: 'Deploys and migrations wait for a click in Slack.' },
      {
        title: 'Ask the team, take the first answer',
        description: 'Claude Code can ask several teammates at once.',
      },
      {
        title: 'Start it from Slack',
        description: 'With `listen`, your Slack message starts Claude Code in the project.',
      },
    ],
    setupIntro: 'Install the plugin, sign in, add Slack, and optionally turn on `listen`.',
    steps: [
      {
        title: 'Install the plugin',
        description: 'Adds the skills and the MCP server to Claude Code.',
        code: CLAUDE_PLUGIN,
      },
      { title: 'Sign in', description: 'Authenticate Agent Inbox in your browser.', code: '/mcp' },
      {
        title: 'Add Slack',
        description: 'Claude Code gives you a link. Paste your App Configuration Token there and click Add to Slack.',
        code: 'Add Slack to my Agent Inbox.',
      },
      {
        title: 'Listen (optional)',
        description: 'Log the CLI in, then run `listen` in your project folder.',
        code: 'npx @agentinbox/cli login\nnpx @agentinbox/cli listen claude-code',
      },
    ],
    prompts: [
      {
        prompt: 'Ask Dan or Maya on Slack before you deploy to production.',
        result: 'Both get the card. The first click decides.',
      },
      {
        prompt: 'Look into the flaky checkout test and reply here.',
        note: '(sent from Slack)',
        result: 'With `listen` on, this starts Claude Code in your project, and it answers in the Slack conversation.',
      },
      { prompt: 'Post in Slack when the migration finishes.', result: 'A tell message, with no reply needed.' },
    ],
    faq: [
      {
        question: 'Is this the same as using Claude in Slack?',
        answer:
          'No. This gives Claude Code, running in your project, its own Slack app so it can ask you and your team questions and wait for answers.',
      },
      {
        question: "Who sees the Allow and Deny for Claude Code's permissions?",
        answer:
          'You do. During a `listen` run, permission requests go to your chat as Allow and Deny buttons, even when a teammate started the run.',
      },
      {
        question: 'Can I skip the plugin and use the CLI?',
        answer:
          'Yes. Run `npx @agentinbox/cli setup slack`, then install the skills with `npx skills add agentinboxhq/skills --agent claude-code`.',
      },
    ],
    cta: '/plugin marketplace add agentinboxhq/skills',
  },
  codex: {
    metaTitle: 'Connect Codex to Slack | Agent Inbox',
    metaDescription:
      "Connect Codex to Slack. It asks your team before it ships changes, takes the first answer, and posts when it's done.",
    intro:
      'Codex gets its own Slack app. It asks you or your team before it ships changes, and posts when the work is done.',
    hero: 'codex plugin marketplace add agentinboxhq/skills',
    heroAlt: 'Codex asking in Slack which API version to keep, with two option buttons',
    benefitsHeading: AUTONOMOUS,
    benefitsIntro: 'Code review habits, applied to your agent.',
    benefits: [
      {
        title: "Ask whoever's around",
        description: 'Send the question to several teammates. The first answer wins.',
      },
      { title: 'Approve with context', description: 'Cards show what Codex wants to do before anyone clicks.' },
      { title: 'Done means posted', description: 'Codex tells the team in Slack when the task is finished.' },
    ],
    setupIntro: 'Install the plugin, sign in, then add Slack from Codex.',
    steps: [
      {
        title: 'Install the plugin',
        description: 'Adds the MCP server and the Agent Inbox skills.',
        code: 'codex plugin marketplace add agentinboxhq/skills\ncodex plugin add agentinbox@agentinbox',
      },
      {
        title: 'Sign in',
        description: 'Opens the Agent Inbox sign-in in your browser.',
        code: 'codex mcp login AgentInbox',
      },
      {
        title: 'Add Slack',
        description: 'Codex gives you a link. Paste your App Configuration Token there and click Add to Slack.',
        code: 'Add Slack to my Agent Inbox.',
      },
      { title: 'Try it', description: 'Ask Codex to message you.', code: 'Ask me on Slack before you merge.' },
    ],
    prompts: [
      {
        prompt: 'Ask Maya or Dan on Slack before you merge the schema change.',
        result: 'Both get the card. The first click decides.',
      },
      {
        prompt: 'If v1 and v2 of the endpoint conflict, ask me on Slack which to keep.',
        result: 'Two buttons, one click.',
      },
      { prompt: 'Post a summary in Slack when the refactor lands.', result: 'A tell message for the team.' },
    ],
    faq: [
      {
        question: 'Does Codex ask before it messages my teammates?',
        answer: 'Yes. With the Agent Inbox skills, Codex asks you first before it reaches anyone other than you.',
      },
      {
        question: 'Can I add the MCP server without the plugin?',
        answer:
          'Yes. Run `codex mcp add AgentInbox --url https://mcp.agentinbox.md`, then `codex mcp login AgentInbox`. Use one or the other, not both.',
      },
      {
        question: 'Do I paste my Slack token into Codex?',
        answer: 'No. Codex gives you a link to the setup page, and you paste the token there.',
      },
    ],
    cta: 'codex plugin marketplace add agentinboxhq/skills',
  },
  opencode: {
    metaTitle: 'Connect OpenCode to Slack | Agent Inbox',
    metaDescription:
      'Connect OpenCode to Slack with the Agent Inbox MCP server. It asks you and your team for decisions and waits for the answer.',
    intro: "OpenCode can ask you and your team on Slack, so a decision doesn't hold up the task.",
    hero: 'opencode mcp add AgentInbox --url https://mcp.agentinbox.md',
    heroAlt: 'OpenCode asking in Slack whether to delete a deprecated package',
    benefitsHeading: AUTONOMOUS,
    benefitsIntro: 'OpenCode keeps going, and the team keeps the decisions.',
    benefits: [
      {
        title: 'Decisions where the team works',
        description: "Questions land in Slack, not in a terminal nobody's watching.",
      },
      { title: 'Approve before it acts', description: 'Deletes and releases wait for a click.' },
      { title: 'Set up per project', description: 'Add the server to one repo, or to all of them with `--global`.' },
    ],
    setupIntro: 'Add the MCP server, sign in, add Slack, and install the skills.',
    steps: [
      {
        title: 'Add the MCP server',
        description: 'Run it in your project, or add `--global` for every project.',
        code: 'opencode mcp add AgentInbox --url https://mcp.agentinbox.md',
      },
      {
        title: 'Sign in',
        description: 'Sign in to Agent Inbox in your browser.',
        code: 'opencode mcp auth AgentInbox',
      },
      {
        title: 'Add Slack',
        description: 'OpenCode gives you a link. Paste your App Configuration Token there and click Add to Slack.',
        code: 'Add Slack to my Agent Inbox.',
      },
      {
        title: 'Add the skills',
        description: 'They teach OpenCode when to reach people.',
        code: 'npx skills add agentinboxhq/skills',
      },
    ],
    prompts: [
      {
        prompt: 'Ask me on Slack before you delete the deprecated package.',
        result: 'OpenCode waits for your Approve.',
      },
      {
        prompt: 'Ask Dan on Slack which test fixtures are still used.',
        result: 'Dan answers in Slack, and OpenCode uses it.',
      },
      { prompt: 'Post in Slack when the release build is ready.', result: 'A tell message, with no reply needed.' },
    ],
    faq: [
      {
        question: 'Where does the server config go?',
        answer:
          "In the project's `opencode.json`, or in `~/.config/opencode/opencode.json` for every project, as a remote MCP server with the URL `https://mcp.agentinbox.md`.",
      },
      {
        question: 'Do I need an API key?',
        answer: 'No. You sign in to Agent Inbox in your browser and approve OpenCode.',
      },
      {
        question: 'Can the same Slack app serve my other agents?',
        answer:
          'Yes. The Slack app belongs to your agent in Agent Inbox. Any tool connected to the same account reaches people through it.',
      },
    ],
    cta: 'opencode mcp add AgentInbox --url https://mcp.agentinbox.md',
  },
  cursor: {
    metaTitle: 'Connect Cursor to Slack | Agent Inbox',
    metaDescription:
      "Let Cursor's agent ask you and your team on Slack before it acts. Add Agent Inbox in one click and answer with a button.",
    intro: "Let Cursor's agent ask you on Slack and wait for your answer, instead of guessing.",
    hero: CURSOR_JSON,
    heroAlt: "Cursor's agent asking in Slack to approve changes to the payments module",
    benefitsHeading: AUTONOMOUS,
    benefitsIntro: 'Questions go to Slack, and the agent keeps working on the rest.',
    benefits: [
      {
        title: 'Ask instead of guessing',
        description: 'Unclear requirements become a Slack question, not a wrong change.',
      },
      { title: 'Approve with a click', description: 'Risky edits wait for your Approve.' },
      { title: 'Bring in a teammate', description: 'The agent can ask the person who owns the code.' },
    ],
    setupIntro: "Add the MCP server, sign in, then ask Cursor's agent to add Slack.",
    steps: [
      {
        title: 'Add Agent Inbox',
        description: 'Click Add to Cursor on agentinbox.md, or install Agent Inbox from the Cursor Marketplace.',
      },
      { title: 'Sign in', description: 'The first time Cursor uses the inbox, it opens the sign-in window.' },
      {
        title: 'Add Slack',
        description:
          "Cursor's agent gives you a link. Paste your App Configuration Token there and click Add to Slack.",
        code: 'Add Slack to my Agent Inbox.',
      },
      {
        title: 'Try it',
        description: 'Ask the agent to message you.',
        code: 'Ask me on Slack before you touch the payments module.',
      },
    ],
    prompts: [
      {
        prompt: 'Ask me on Slack before you touch the payments module.',
        result: 'The agent waits for your Approve.',
      },
      {
        prompt: 'Ask Maya on Slack how the auth middleware is supposed to work.',
        result: 'Maya replies in Slack, and the agent uses her answer.',
      },
      { prompt: 'Post in Slack when the PR is ready.', result: 'A tell message, with no reply needed.' },
    ],
    faq: [
      {
        question: 'Does Cursor have to keep running while it waits?',
        answer:
          'The agent waits while it runs. If it stops first, the answer stays in the conversation for the next session to read.',
      },
      {
        question: 'Can Cursor message people other than me?',
        answer: "Yes, once they're contacts. Invite them first, and the agent can ask them directly.",
      },
      {
        question: 'Can the same Slack connection serve other agents?',
        answer:
          'Yes. The Slack app belongs to your agent in Agent Inbox, so Claude Code, Codex and your other tools can use it too.',
      },
    ],
    cta: CURSOR_JSON,
  },
  hermes: {
    metaTitle: 'Connect Hermes to Slack | Agent Inbox',
    metaDescription:
      'Connect Hermes to Slack with Agent Inbox. It reports to your team, asks before it acts, and waits for an answer in your workspace.',
    intro:
      'Hermes runs on its own. On Slack, it can report to your team and ask for decisions where everyone already works.',
    hero: 'hermes mcp add AgentInbox --url https://mcp.agentinbox.md --auth oauth',
    heroAlt: 'Hermes posting a weekly report summary in Slack and asking whether to publish it',
    benefitsHeading: AUTONOMOUS,
    benefitsIntro: 'Hermes works in the background and checks in with the team.',
    benefits: [
      { title: 'Reports where the team reads', description: 'Results go to Slack, not a log file.' },
      { title: 'Approve before it acts', description: 'Publishing and spending wait for a click.' },
      { title: 'The right person answers', description: 'Ask the teammate who owns the decision.' },
    ],
    setupIntro: "Install the skills, add the MCP server on Hermes's computer, then add Slack from Hermes.",
    steps: [
      {
        title: 'Install the skills',
        description: 'Into `~/.hermes/skills`, once for every project.',
        code: 'npx skills add agentinboxhq/skills -g --agent hermes-agent -y',
      },
      {
        title: 'Add the MCP server',
        description: 'Run it on the computer Hermes runs on, and answer yes to enable the tools.',
        code: 'hermes mcp add AgentInbox --url https://mcp.agentinbox.md --auth oauth',
      },
      {
        title: 'Reload',
        description: 'Load the new tools in an open session, or start a new one.',
        code: '/reload-mcp',
      },
      {
        title: 'Add Slack',
        description: 'Hermes gives you a link. Paste your App Configuration Token there and click Add to Slack.',
        code: 'Add Slack to my Agent Inbox.',
      },
    ],
    prompts: [
      {
        prompt: 'Ask Dan on Slack before you publish the weekly report.',
        result: 'Dan gets Approve and Deny. Hermes waits for his click.',
      },
      { prompt: 'Post the competitor price check in Slack every Monday.', result: 'A tell message for the team.' },
      {
        prompt: 'Ask the team on Slack which of the three drafts to send.',
        result: 'The first person to pick decides.',
      },
    ],
    faq: [
      {
        question: 'Can Hermes add Slack itself?',
        answer:
          'Hermes can start it with a link, but you finish it: paste the App Configuration Token on the setup page and click Add to Slack.',
      },
      {
        question: 'What if Hermes runs without a browser?',
        answer:
          "During sign-in, Hermes prints a link. Open it on any device, approve, then paste the address your browser ends on at Hermes's prompt.",
      },
      {
        question: 'How do I check the tools loaded?',
        answer: 'Run `hermes mcp test AgentInbox`. It connects and lists the inbox tools.',
      },
    ],
    cta: 'hermes mcp add AgentInbox --url https://mcp.agentinbox.md --auth oauth',
  },
  openclaw: {
    metaTitle: 'Connect OpenClaw to Slack | Agent Inbox',
    metaDescription:
      "Connect OpenClaw to Slack. Your assistant asks before it acts, checks with the right teammate, and posts when the job's done.",
    intro: "OpenClaw gets its own Slack app. It asks you or a teammate before it acts, and posts when the job's done.",
    hero: 'npx @agentinbox/cli setup slack',
    heroAlt: 'OpenClaw asking in Slack to approve a vendor payment',
    benefitsHeading: AUTONOMOUS,
    benefitsIntro: 'An assistant that works for the team, not only for you.',
    benefits: [
      { title: 'Approve before it acts', description: 'Payments, bookings and outgoing messages wait for a click.' },
      { title: 'Ask the right person', description: 'OpenClaw can ask the teammate who owns the decision.' },
      { title: 'Updates in the channel', description: 'It posts when a task is done or stuck.' },
    ],
    setupIntro: 'Connect your Slack app with the CLI, then add the skill to OpenClaw.',
    steps: [
      {
        title: 'Install the CLI',
        description: 'Install it once, or use `npx @agentinbox/cli`.',
        code: '$ npm i -g @agentinbox/cli',
        output: INSTALL_OUTPUT,
      },
      {
        title: 'Connect Slack',
        description: 'Paste a Slack App Configuration Token, then click Add to Slack.',
        code: '$ agentinbox setup slack',
      },
      {
        title: 'Add the skill to OpenClaw',
        description: 'Into `~/.openclaw/skills`. A new session picks it up.',
        code: '$ npx skills add agentinboxhq/skills -g --agent openclaw -y',
      },
      {
        title: 'Try it',
        description: 'Ask OpenClaw to message you.',
        code: 'Ask me on Slack before you book anything.',
      },
    ],
    prompts: [
      {
        prompt: 'Ask Maya on Slack before you pay the Northwind invoice.',
        result: 'Maya gets Approve and Deny. OpenClaw pays only after her click.',
      },
      {
        prompt: 'Find three dates for the team offsite and let the team pick in Slack.',
        result: 'Options as buttons. The first pick wins.',
      },
      { prompt: 'Post in Slack when the expense report is filed.', result: 'A tell message, with no reply needed.' },
    ],
    faq: [
      {
        question: 'What do I need from Slack?',
        answer:
          'A Slack App Configuration Token and permission to install apps in your workspace. You paste the token in the terminal or on the setup page.',
      },
      {
        question: 'Can OpenClaw message people outside my contacts?',
        answer:
          "It can reply to people who write first, but it can't message them first. Invite teammates as contacts to let OpenClaw reach them.",
      },
      {
        question: 'Can I add Slack later if I started with email?',
        answer: 'Yes. Run `agentinbox channel add slack` and your agent keeps its email address too.',
      },
    ],
    cta: 'npx @agentinbox/cli setup slack',
  },
  claude: {
    metaTitle: 'Connect Claude to Slack | Agent Inbox',
    metaDescription:
      'Add Agent Inbox to Claude and ask your teammates on Slack from the chat. Claude sends the question and brings back the answer.',
    intro:
      'Add Agent Inbox to Claude, and Claude can ask your teammates on Slack from the chat, then show you what they said.',
    hero: MCP_URL,
    heroAlt: "A Claude chat showing a teammate's Slack answer about a launch date",
    benefitsHeading: FROM_THE_CHAT,
    benefitsIntro: 'Get answers from your team without switching apps.',
    benefits: [
      {
        title: 'Ask a teammate from the chat',
        description: 'Claude sends the question in Slack and shows you the answer.',
      },
      {
        title: 'Get sign-off with buttons',
        description: 'Approvals arrive in Slack as a card with Approve and Deny.',
      },
      {
        title: 'Add Slack from the chat',
        description: 'Claude gives you a link to finish connecting Slack in your browser.',
      },
    ],
    setupIntro: 'Add Agent Inbox as a custom connector, then add Slack from the chat.',
    steps: [
      {
        title: 'Add the connector',
        description: 'Open Settings › Connectors, choose Add custom connector, and paste the address.',
        code: MCP_URL,
      },
      { title: 'Connect and sign in', description: 'Click Connect, sign in to Agent Inbox and approve.' },
      {
        title: 'Add Slack',
        description: 'Claude gives you a link. Paste your App Configuration Token there and click Add to Slack.',
        code: 'Add Slack to my Agent Inbox.',
      },
      {
        title: 'Try it',
        description: 'Ask Claude to reach a teammate.',
        code: 'Ask Dan on Slack when the launch date is.',
      },
    ],
    prompts: [
      { prompt: 'Ask Dan on Slack when the launch date is.', result: 'Claude asks Dan and shows you his reply.' },
      {
        prompt: 'Ask Maya on Slack to approve the press release.',
        result: 'Maya gets a card with Approve and Deny.',
      },
      {
        prompt: "Who's waiting on an answer from my agent in Slack?",
        result: 'A list of open conversations.',
      },
    ],
    faq: [
      {
        question: 'Is this the Claude app for Slack?',
        answer:
          "No. This lets Claude, in your chat, reach your teammates through your agent's own Slack app and bring back their answers.",
      },
      {
        question: 'Who can Claude message in Slack?',
        answer: 'Your contacts. Invite teammates first, and Claude can reach them.',
      },
      {
        question: 'Does Claude wait for the reply?',
        answer:
          'For a short while. If the answer comes later, ask Claude to check your Agent Inbox and it reads the reply.',
      },
    ],
    cta: MCP_URL,
  },
  chatgpt: {
    metaTitle: 'Connect ChatGPT to Slack | Agent Inbox',
    metaDescription:
      'Add Agent Inbox to ChatGPT and message teammates on Slack from the chat. ChatGPT asks, waits, and tells you what they said.',
    intro: 'Add Agent Inbox to ChatGPT, and it can message your teammates on Slack and tell you what they said.',
    hero: MCP_URL,
    heroAlt: "A ChatGPT conversation reporting a teammate's Slack approval",
    benefitsHeading: FROM_THE_CHAT,
    benefitsIntro: 'Get a quick answer from the team without leaving ChatGPT.',
    benefits: [
      { title: 'Message teammates for you', description: 'ChatGPT asks in Slack and reports the answer.' },
      { title: 'Approvals with a click', description: 'Your teammate clicks Approve or Deny in Slack.' },
      { title: 'Catch up on the inbox', description: 'Ask what people sent your agent today.' },
    ],
    setupIntro: 'Create the connector in developer mode, then add Slack from the chat.',
    steps: [
      {
        title: 'Create the connector',
        description:
          'Switch on Developer mode in Settings › Apps & Connectors › Advanced, then create a connector with this address.',
        code: MCP_URL,
      },
      {
        title: 'Sign in',
        description: 'ChatGPT opens a sign-in window. Sign in to Agent Inbox and approve.',
      },
      {
        title: 'Add Slack',
        description: 'ChatGPT gives you a link. Paste your App Configuration Token there and click Add to Slack.',
        code: 'Add Slack to my Agent Inbox.',
      },
      {
        title: 'Try it',
        description: 'Ask ChatGPT to message a teammate.',
        code: 'Ask Leo on Slack if the invoices went out.',
      },
    ],
    prompts: [
      { prompt: 'Ask Leo on Slack if the invoices went out.', result: 'ChatGPT asks Leo and tells you his answer.' },
      {
        prompt: 'Ask Priya on Slack to approve the discount for Acme.',
        result: 'Priya gets a card with Approve and Deny.',
      },
      {
        prompt: 'What came into my Agent Inbox from Slack today?',
        result: 'A short summary of each conversation.',
      },
    ],
    faq: [
      {
        question: 'Why does ChatGPT need developer mode?',
        answer:
          'ChatGPT adds custom connectors through developer mode. Switch it on once, then create the connector with `https://mcp.agentinbox.md`.',
      },
      {
        question: 'Do my teammates need Agent Inbox accounts?',
        answer: 'No. They connect in Slack through an invite link and answer there.',
      },
      {
        question: 'What if my teammate answers hours later?',
        answer:
          'The answer is saved in the conversation until the question expires: 24 hours by default, up to 5 days. Ask ChatGPT to check your Agent Inbox to read it.',
      },
    ],
    cta: MCP_URL,
  },
  'grok-bot': {
    metaTitle: 'Connect Grok Bot to Slack | Agent Inbox',
    metaDescription:
      'Connect Grok Bot to Agent Inbox and Slack. It asks you or your team before it acts and waits for a click.',
    intro: 'Connect Grok Bot to Agent Inbox, add Slack, and it can ask you or your team before it acts.',
    hero: MCP_URL,
    heroAlt: 'Grok Bot asking in Slack for approval, with Approve and Deny buttons',
    benefitsHeading: AUTONOMOUS,
    benefitsIntro: 'Grok Bot checks with the team before it acts.',
    benefits: [
      { title: 'Approve with a click', description: 'Anything hard to undo waits for Approve in Slack.' },
      { title: 'Ask the team', description: 'Send one question to several teammates and take the first answer.' },
      { title: 'Updates where you work', description: "Grok Bot posts in Slack when it's done." },
    ],
    setupIntro: 'Add the MCP server, sign in, then add Slack from Grok Bot.',
    steps: [
      {
        title: 'Add the MCP server',
        description:
          'Add Agent Inbox in Grok Bot with this address, or paste "Set up Agent Inbox from https://www.agentinbox.md/agents.md".',
        code: MCP_URL,
      },
      { title: 'Sign in', description: 'Sign in to Agent Inbox when asked, and approve the connection.' },
      {
        title: 'Add Slack',
        description: 'Grok Bot gives you a link. Paste your App Configuration Token there and click Add to Slack.',
        code: 'Add Slack to my Agent Inbox.',
      },
      { title: 'Try it', description: 'Ask Grok Bot to message you.', code: 'Ask me on Slack before you send it.' },
    ],
    prompts: [
      {
        prompt: 'Ask me on Slack before you send anything to a customer.',
        result: 'Grok Bot waits for your Approve.',
      },
      { prompt: 'Ask Dan or Maya on Slack which draft to use.', result: 'The first pick decides.' },
      { prompt: 'Post in Slack when the research is done.', result: 'A tell message, with no reply needed.' },
    ],
    faq: [
      {
        question: 'Is there a key or header to configure?',
        answer: 'No. Add `https://mcp.agentinbox.md` with no headers, then sign in to Agent Inbox in your browser.',
      },
      {
        question: 'Does Grok Bot see my Slack token?',
        answer: 'No. You paste it on the Agent Inbox setup page in your browser.',
      },
      {
        question: 'Can teammates answer?',
        answer: "Yes, once they're contacts. Invite them, and Grok Bot can send a question to several at once.",
      },
    ],
    cta: MCP_URL,
  },
  'any-agent': {
    metaTitle: 'Connect Any AI Agent to Slack | Agent Inbox',
    metaDescription:
      'Connect any AI agent or script to Slack with the Agent Inbox CLI or MCP server. It asks your team and waits for a click.',
    intro:
      'Any agent that can run a shell command or connect to an MCP server can ask your team on Slack and wait for the answer.',
    hero: 'npx @agentinbox/cli setup slack',
    heroAlt: 'A CI pipeline step waiting for a team approval in Slack',
    benefitsHeading: AUTONOMOUS,
    benefitsIntro: "Put your team's sign-off in any workflow.",
    benefits: [
      {
        title: 'A team approval in your pipeline',
        description: 'A CI step waits until someone on the team clicks Approve.',
      },
      {
        title: 'Cards people understand',
        description: "`--subtitle`, `--body` and `--icon` show exactly what's being approved.",
      },
      {
        title: 'MCP for everything else',
        description: 'Any remote MCP client with OAuth sign-in connects to `https://mcp.agentinbox.md`.',
      },
    ],
    setupIntro: 'Connect Slack with the CLI, then ask from your code.',
    steps: [
      {
        title: 'Install the CLI',
        description: 'Install it once, or use `npx @agentinbox/cli`.',
        code: '$ npm i -g @agentinbox/cli',
      },
      {
        title: 'Connect Slack',
        description: 'Paste a Slack App Configuration Token, then click Add to Slack.',
        code: '$ agentinbox setup slack',
      },
      {
        title: 'Ask from your code',
        description: 'The command waits for a click. The exit code says what happened.',
        code: '$ agentinbox send approve "Deploy v2.4?" --to dan,maya --subtitle "main → production" && ./deploy.sh',
      },
      {
        title: 'Or connect over MCP',
        description: 'Add this server to any remote MCP client, with no headers or key.',
        code: MCP_URL,
      },
    ],
    prompts: [
      {
        prompt: 'Ask the on-call team on Slack before the job scales down the database.',
        result: 'The job waits for the first Approve.',
      },
      { prompt: 'Post in Slack when the data export is ready.', result: 'A tell message for the team.' },
      {
        prompt: 'Ask on Slack which feature flag to turn on, with the flags as options.',
        result: 'Someone clicks one, and your agent gets its id.',
      },
    ],
    faq: [
      {
        question: 'How does my script read the answer?',
        answer:
          'From the exit code: 0 approved or answered, 10 denied, 11 the wait ran out with the question still open, 12 expired, 1 an error. `--json` prints who answered and when.',
      },
      {
        question: 'Can I show a tool icon on the card?',
        answer:
          'Yes, in Slack only. Pass `--icon` with a catalog id such as `stripe`, or an https URL to a 32×32 image.',
      },
      {
        question: 'Can I connect a CI job?',
        answer:
          'Yes. Connect it with a one-time code from agentinbox.md, or set the `INBOX_SECRET_KEY` environment variable.',
      },
    ],
    cta: 'npx @agentinbox/cli setup slack',
  },
};

const AGENT_PAGES: Record<ChannelId, Record<AgentId, AgentPage>> = {
  email: EMAIL_AGENTS,
  telegram: TELEGRAM_AGENTS,
  slack: SLACK_AGENTS,
};

/* --------------------------------------------------------------- accessors */

export function channelHub(channel: ChannelId): ChannelHub {
  return HUBS[channel];
}
export function agentPage(channel: ChannelId, agent: AgentId): AgentPage {
  return AGENT_PAGES[channel][agent];
}

/** "Connect Claude Code" / "to email"; the any-agent page reads "Connect any agent to email". */
export function agentHeading(channel: ChannelId, agent: AgentId) {
  const name = agent === 'any-agent' ? 'any agent' : AGENTS[agent].name;
  return { lead: `Connect ${name}`, accent: `to ${CHANNELS[channel].h1Name}` };
}
/** The setup heading's subject: "Connect Claude Code in four steps", "Connect your agent in four steps". */
export function setupSubject(agent: AgentId) {
  return agent === 'any-agent' ? 'your agent' : AGENTS[agent].name;
}

export function pageFaq(channel: ChannelId, agent?: AgentId): FaqItem[] {
  const items = agent ? agentPage(channel, agent).faq : channelHub(channel).faq;
  return items.map((item, index) => ({
    id: `q${index + 1}`,
    question: plain(item.question),
    answer: plain(item.answer),
    defaultOpen: index === 0,
  }));
}

/** "What else it can do" on agent pages: the same rows on every agent page of a channel. */
export const CAPABILITIES = [
  { label: 'ask', description: 'Ask a question and get a written reply', anchor: 'message-types' },
  { label: 'approve', description: 'Get a yes or no before anything hard to undo', anchor: 'message-types' },
  { label: 'choose', description: 'Offer 2 to 10 options as buttons', anchor: 'message-types' },
  { label: 'tell', description: 'Send an update without waiting', anchor: 'message-types' },
  { label: 'invite', description: 'Bring teammates in as contacts', anchor: 'who-can-reach' },
] as const;

/** Resource cards in the hub's closing section. */
export function channelResources(channel: ChannelId) {
  const name = CHANNELS[channel].name;
  return [
    { label: 'docs', title: `${name} setup`, description: `Connect ${name} step by step`, href: `/${channel}#setup` },
    { label: 'docs', title: 'CLI reference', description: 'Every command and flag', href: '/agents.md' },
    {
      label: 'blog',
      title: 'Introducing Agent Inbox',
      description: 'Why we built an inbox for agents, and what it does',
      href: 'https://www.novu.co/blog/agent-inbox/',
    },
    {
      label: 'blog',
      title: 'What is an inbox for AI agents?',
      description: 'How it works and when you need one',
      href: 'https://www.novu.co/blog/what-is-an-inbox-for-agents/',
    },
  ];
}
