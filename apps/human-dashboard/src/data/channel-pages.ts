import type { FaqItem } from '@/data/sapien-faq';
import { hostOf, skillsCommand } from '@/lib/hosts';
import { SITE_ORIGIN } from '@/lib/seo';

export const CHANNEL_IDS = ['email', 'telegram', 'slack'] as const;
export type ChannelId = (typeof CHANNEL_IDS)[number];
export const AGENT_IDS = ['openclaw', 'claude-code', 'hermes', 'codex', 'cursor'] as const;
export type AgentId = (typeof AGENT_IDS)[number];

export const AGENTS: Record<AgentId, { name: string; description: string }> = {
  openclaw: { name: 'OpenClaw', description: 'Open-source personal assistant that runs on your machine.' },
  'claude-code': { name: 'Claude Code', description: 'Anthropic’s coding agent for the terminal.' },
  hermes: { name: 'Hermes', description: 'Open-source agent by Nous Research.' },
  codex: { name: 'Codex', description: 'OpenAI’s coding agent.' },
  cursor: { name: 'Cursor', description: 'AI code editor with background agents.' },
};

export const CHANNELS = {
  telegram: {
    name: 'Telegram',
    noun: 'Telegram bot',
    location: 'on Telegram',
    description:
      'Your agent messages you on Telegram, asks for approval with tap-to-answer buttons, and waits for the reply. One command to set up, no bot code to write.',
  },
  // Draft copy: the supplied design shows Telegram; these variants share its template.
  email: {
    name: 'Email',
    noun: 'email inbox',
    location: 'over email',
    description:
      'Give your agent an email address. It can message you, ask for input or approval, and receive your reply through the same CLI.',
  },
  slack: {
    name: 'Slack',
    noun: 'Slack connection',
    location: 'in Slack',
    description:
      'Bring your agent into Slack. It can ask questions, request approvals, and keep your team informed without leaving the conversation.',
  },
} satisfies Record<ChannelId, { name: string; noun: string; location: string; description: string }>;

/** The eight agent/channel pairs in the approved page-structure brief. */
export const CHANNEL_AGENTS = {
  email: ['openclaw'],
  telegram: ['openclaw', 'claude-code', 'hermes'],
  slack: ['claude-code', 'openclaw', 'codex', 'cursor'],
} as const satisfies Record<ChannelId, readonly AgentId[]>;

export function isChannelId(value: string): value is ChannelId {
  return CHANNEL_IDS.some((id) => id === value);
}
export function isAgentId(value: string): value is AgentId {
  return AGENT_IDS.some((id) => id === value);
}
export function hasAgentPage(channel: ChannelId, agent: string): agent is AgentId {
  return CHANNEL_AGENTS[channel].some((id) => id === agent);
}
export function agentPagePairs() {
  return CHANNEL_IDS.flatMap((channel) => CHANNEL_AGENTS[channel].map((agent) => ({ channel, agent })));
}
export function setupCommand(channel: ChannelId) {
  return `npx @agentinbox/cli setup ${channel}`;
}
export function setupPrompt(channel: ChannelId, agent?: AgentId) {
  return `Set up Agent Inbox${agent ? ` for ${AGENTS[agent].name}` : ''} ${CHANNELS[channel].location}. Read ${SITE_ORIGIN}/agents.md for setup instructions. Before running ${setupCommand(channel)} in a non-interactive terminal, ask me for any required operator email address and agent name, and pass them with --email and --agent-name. Show me the setup link to complete, then use Agent Inbox to ask questions, request approvals, offer choices, and send updates.`;
}
export function otherAgentChannels(channel: ChannelId, agent: AgentId) {
  return CHANNEL_IDS.filter((id) => id !== channel && hasAgentPage(id, agent));
}

export type Feature = { title: string; description: string; icon: string };
export function channelFeatures(channel: ChannelId): Feature[] {
  return [
    {
      title: 'Message you first',
      description: 'Starts the chat the moment it needs a human, not only when you write to it.',
      icon: 'channel-feature-0',
    },
    {
      title: channel === 'email' ? 'A reply your agent can use' : 'Tap-to-answer buttons',
      description:
        channel === 'email'
          ? 'Questions, approvals and choices come back to the agent with their context.'
          : 'Approvals and choices arrive as inline buttons. One tap and the agent continues.',
      icon: 'channel-feature-1',
    },
    {
      title: 'Replies in context',
      description: 'Answer in the chat and the reply lands back in the right conversation.',
      icon: 'channel-feature-2',
    },
    {
      title: 'Files both ways',
      description: 'Send receipts, logs and screenshots, or receive the photo you snap.',
      icon: 'channel-feature-3',
    },
  ];
}
export const AGENT_BENEFITS: Feature[] = [
  {
    title: 'Approve before it acts',
    description: 'Bookings, payments and outgoing messages wait for your tap.',
    icon: 'agent-benefit-0',
  },
  {
    title: 'Hear back without checking in',
    description: 'Your agent tells you when a task is done, or stuck and needs you.',
    icon: 'agent-benefit-1',
  },
  {
    title: 'One thread per task',
    description: 'Every request keeps its context, so replies never get mixed up.',
    icon: 'agent-benefit-2',
  },
];

export type SetupStep = { title: string; description: string; command: string; output: string };
export function setupSteps(channel: ChannelId, agent?: AgentId): SetupStep[] {
  const name = CHANNELS[channel].name;
  const steps: SetupStep[] = [
    {
      title: 'Install the CLI',
      description: 'One global package for every agent and every channel.',
      command: 'npm i -g @agentinbox/cli',
      output: 'added 1 package in 2s\n✓ agentinbox is ready',
    },
    {
      title: `Connect ${name}`,
      description:
        channel === 'telegram'
          ? 'Create a bot with BotFather and enter its token during setup. Open the printed link and tap Start.'
          : `Follow the setup link to connect ${name} to your Agent Inbox.`,
      command: setupCommand(channel),
      output: `Open the setup link to finish connecting ${name}.`,
    },
  ];
  if (agent) {
    const host = hostOf(agent);
    if (host.group !== 'commands') throw new Error('Landing setup requires an agent that runs commands');
    steps.push({
      title: `Add the skill to ${AGENTS[agent].name}`,
      description: `Lets ${AGENTS[agent].name} ask for input, request approvals, offer choices and send updates.`,
      command: skillsCommand(host),
      output: `Follow the installer instructions for ${AGENTS[agent].name}.`,
    });
  }
  steps.push({
    title: agent ? 'Try it' : 'Send the first message',
    description: agent
      ? `Ask ${AGENTS[agent].name} to check with you, then watch for the reply.`
      : `Your agent can now ask, approve, choose and tell ${CHANNELS[channel].location}.`,
    command: `agentinbox send "Hello from your agent" --via ${channel}`,
    output: 'Your message is ready for delivery through the connected channel.',
  });
  return steps;
}

export const MESSAGE_EXAMPLES = [
  {
    id: 'ask',
    label: 'Ask',
    command: 'agentinbox send ask "Where should I send the receipt?" --to maya',
    output: '{ "reply": "billing@acme.com" }',
    image: 'hero-telegram.jpg',
    alt: 'An agent asks where to send a receipt and receives an email address.',
  },
  {
    id: 'approve',
    label: 'Approve',
    command: `agentinbox send \\\n    approve 'Refund $240 to Acme Corp?' \\\n    --to maya --ttl 2h`,
    output: '{ "status": "approved", "by": "maya", "via": "telegram" }',
    image: 'approve-text.svg',
    alt: 'An approval request with Approve and Deny options.',
  },
  {
    id: 'choose',
    label: 'Choose',
    command: 'agentinbox send choose "Which table?" --option slot1:19:00 --option slot2:19:30 --option slot3:20:15',
    output: '{ "choice": "slot2" }',
    image: 'prompt-choose.png',
    alt: 'A choice of three restaurant reservation times.',
  },
  {
    id: 'tell',
    label: 'Tell',
    command: 'agentinbox send "Nightly scrape done: 1,240 pages, 0 errors."',
    output: '{ "status": "sent" }',
    image: 'prompt-tell.png',
    alt: 'An agent reports a completed nightly scrape.',
  },
] as const;

export const USE_CASES = [
  {
    label: 'support',
    title: 'Approve refunds from your phone',
    description: 'A support agent drafts the refund and waits for one tap before it touches Stripe.',
    command: "agentinbox send approve 'Refund $240?' --to maya",
  },
  {
    label: 'devops',
    title: 'Ship with a human in the loop',
    description: 'A deploy agent pauses before production and asks the on-call engineer.',
    command: 'agentinbox send approve "Deploy v2.4 to prod?"',
  },
  {
    label: 'personal assistant',
    title: 'Let your assistant ask, not guess',
    description: 'It checks which flight, which time, which card, and only then books.',
    command: 'agentinbox send choose "Which flight?" \\\n  --option 9am --option 1pm',
  },
  {
    label: 'monitoring',
    title: 'Get told when it matters',
    description: 'Nightly jobs and long runs report back when they finish or fail.',
    command: 'agentinbox send "Nightly build: 0 failures"',
  },
] as const;

export function channelFaq(channel: ChannelId): FaqItem[] {
  const name = CHANNELS[channel].name;
  return [
    {
      id: 'setup',
      question: channel === 'telegram' ? 'Do I need to create a Telegram bot myself?' : `How do I connect ${name}?`,
      answer:
        channel === 'telegram'
          ? 'Yes. Create a bot with BotFather and paste its token into the setup prompt or linked setup page, then open the bot link and tap Start.'
          : `Run ${setupCommand(channel)} and follow the setup link to connect your account.`,
      defaultOpen: true,
    },
    {
      id: 'people',
      question: 'Can more than one person talk to the same agent?',
      answer:
        'Yes. Invite teammates with a one-time link. Each person gets their own chat, and the agent can address any of them with --to.',
    },
    {
      id: 'expiry',
      question: 'What happens if nobody answers?',
      answer:
        'Every request has a time to live. When it expires, the agent gets an expired status and can retry, escalate, or pick a safe default.',
    },
    {
      id: 'strangers',
      question:
        channel === 'telegram'
          ? 'Can my agent message people who haven’t written to it first?'
          : 'Can I control who reaches my agent?',
      answer:
        channel === 'telegram'
          ? 'Only people who opened the bot through an invite or setup link. Telegram does not let bots start chats with strangers.'
          : 'Add contacts and invite people you know. Messages from strangers can wait in screening before your agent sees them.',
    },
    {
      id: 'price',
      question: `Does it cost anything to use ${name}?`,
      answer: `${name} is included in every plan, including the free tier of 100 conversations a month.`,
    },
  ];
}
export function agentFaq(channel: ChannelId, agent: AgentId): FaqItem[] {
  const name = AGENTS[agent].name;
  return [
    {
      id: 'running',
      question: `Does ${name} have to keep running while it waits?`,
      answer: `No. Requests are stored by Agent Inbox. ${name} can pick up the answer later with the request id, even after a restart.`,
      defaultOpen: true,
    },
    {
      id: 'contacts',
      question: `Can ${name} message other people, not just me?`,
      answer: `Yes. Invite them to ${CHANNELS[channel].name} first, then ${name} can address them by name with --to.`,
    },
    {
      id: 'reuse',
      question: `Can I use the same ${CHANNELS[channel].noun} for other agents?`,
      answer: 'Yes. One inbox can serve several agents. Each message shows which agent sent it.',
    },
  ];
}
