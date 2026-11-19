import type { AgentId, ChannelId } from '@/data/channel-pages';
import type { FaqItem } from '@/data/sapien-faq';

const cli = 'npx @agentinbox/cli';

export type ExampleMessage = {
  sender?: string;
  text: string;
  detail?: string;
  time: string;
};

type UseCase = {
  id: string;
  label: string;
  title: string;
  intro: string;
  points: string[];
  agents?: AgentId[];
  tools?: string[];
  channel: ChannelId;
  link: { label: string; href: string };
  message: ExampleMessage;
  incoming?: ExampleMessage;
  reply?: ExampleMessage;
  options?: string[];
  selected?: string;
  status?: string;
  command: string;
  note?: string;
  prompt?: boolean;
  glow?: 'right' | 'center';
};

type UseCaseGroup = {
  title: string;
  description: string;
  cases: UseCase[];
};

export const USE_CASE_GROUPS: readonly UseCaseGroup[] = [
  {
    title: 'Ask before acting',
    description: "Your agent stops and checks before anything it can't take back.",
    cases: [
      {
        id: 'approvals',
        label: 'Approvals',
        title: 'Get a yes before anything hard to undo',
        intro:
          "Deploys, refunds and deleting data shouldn't happen on a guess. Your agent asks, waits, and only goes ahead on a yes.",
        points: [
          'Approve and Deny arrive as buttons on email, Telegram or Slack.',
          'The agent waits for the answer, or until the time limit you set runs out.',
          'Every answer records who gave it and when.',
        ],
        channel: 'slack',
        link: { label: 'See it on Slack', href: '/slack' },
        message: { sender: 'agent', text: 'Issue a $240 refund to Acme Corp?', detail: 'ORD-4821', time: '2:13 PM' },
        options: ['Approve', 'Deny'],
        selected: 'Approve',
        status: 'Approved by Maya at 2:14 PM',
        command: `${cli} send approve 'Refund $240 to Acme Corp?' --to maya --ttl 2h`,
      },
      {
        id: 'support',
        label: 'Support',
        title: 'Escalate to a person without dropping the customer',
        intro:
          'Your support agent handles the routine. When a refund is too big or a case is unclear, it asks the team in Slack and carries on with the answer.',
        points: [
          'Send one question to the whole support team. The first valid answer wins.',
          'Cards show the details, such as the order and the amount, so nobody has to dig.',
          'If nobody answers in time, the question expires and the agent takes your fallback path.',
        ],
        channel: 'slack',
        link: { label: 'See it on Slack', href: '/slack' },
        message: {
          sender: 'support-agent',
          text: 'Refund $480 to Northwind?',
          detail: 'Over the $250 auto-approve limit',
          time: '11:06 AM',
        },
        options: ['Approve', 'Deny'],
        command: `${cli} send approve 'Refund $480 to Northwind?' --to maya,dan,lee --subtitle 'Over the $250 auto-approve limit' --ttl 4h`,
        glow: 'right',
      },
      {
        id: 'on-call',
        label: 'On-call',
        title: 'Put the on-call engineer one tap from the decision',
        intro:
          'Your ops agent spots the problem and prepares the options. The engineer on call decides, from wherever they are.',
        points: [
          'Ask everyone on call at once. The first person to answer decides.',
          'Choose lets them pick between a rollback, a restart or waiting it out.',
          'Exit codes tell your script exactly what happened: answered, denied, still waiting or expired.',
        ],
        tools: ['Scripts', 'CI jobs'],
        channel: 'telegram',
        link: { label: 'Any agent on Telegram', href: '/telegram/any-agent' },
        message: { sender: 'ops-agent', text: 'Checkout error rate is 12%. What should I do?', time: '2:07 AM' },
        options: ['Roll back to v2.3', 'Restart pods', 'Wait 10 minutes'],
        command: `${cli} send choose "Checkout error rate is 12%" --option rollback:"Roll back to v2.3" --option restart:"Restart pods" --option wait:"Wait 10 minutes" --to ana,raj`,
      },
    ],
  },
  {
    title: 'Work with people',
    description: 'Your agent asks people, hears from them, and takes work from them.',
    cases: [
      {
        id: 'coding-agents',
        label: 'Coding agents',
        title: 'Let your coding agent check in, and start it from your phone',
        intro:
          "Claude Code, Codex and OpenCode can work for an hour without you. Agent Inbox lets them ask when they're unsure, and lets you hand them work from anywhere.",
        points: [
          'Questions and choices reach you, not a terminal you walked away from.',
          'With listen, a message from you starts the agent in your project.',
          'During those runs, permissions come to you as Allow and Deny, and no answer means no.',
        ],
        agents: ['claude-code', 'codex', 'opencode', 'cursor'],
        channel: 'telegram',
        link: { label: 'Claude Code on Telegram', href: '/telegram/claude-code' },
        message: { sender: 'claude-code', text: 'Two fixes for the flaky checkout test. Which one?', time: '4:02 PM' },
        options: ['Retry with backoff', 'Mock the payment API'],
        command: `${cli} listen claude-code`,
        note: '# also codex and opencode',
      },
      {
        id: 'personal-assistants',
        label: 'Personal assistants',
        title: 'A personal assistant you can text',
        intro:
          "Message your assistant the way you'd message a person. It replies on the same channel, and checks with you before it pays, books or sends anything.",
        points: [
          'Each agent has its own email address, Telegram bot and Slack app, and a contact card with a QR code to share.',
          'Options arrive as buttons, so picking a restaurant takes one tap.',
          'People you invite can message it too. Strangers’ messages are information, never instructions.',
        ],
        agents: ['openclaw', 'hermes', 'claude', 'chatgpt', 'grok-bot'],
        channel: 'telegram',
        link: { label: 'OpenClaw on Telegram', href: '/telegram/openclaw' },
        incoming: { text: 'Find me a table for two on Friday.', time: '6:40 PM' },
        message: { sender: 'openclaw', text: 'Three options for Friday:', time: '6:41 PM' },
        options: ['Lupa, 7:30 PM', 'Nopa, 8:00 PM', 'Zuni, 8:15 PM'],
        command: 'Before you pay any bill over $500, ask me on Telegram.',
        prompt: true,
        glow: 'center',
      },
      {
        id: 'team-requests',
        label: 'Team requests',
        title: 'Ask the team for what the agent needs',
        intro:
          'Your agent needs a number from finance or a decision from design. It asks the right person on the channel they use, and follows up until it has an answer.',
        points: [
          'Invite teammates as contacts, each on the channel they prefer.',
          'Ask for a written answer, or offer choices.',
          'Answers that arrive late still land in the conversation, and the agent picks them up on its next run.',
        ],
        channel: 'slack',
        link: { label: 'See it on Slack', href: '/slack' },
        message: { sender: 'agent', text: "What's the Q3 budget for the EMEA launch?", time: '9:20 AM' },
        reply: { text: '€40k, approved last week.', time: '9:31 AM' },
        command: `${cli} send ask "What's the Q3 budget for the EMEA launch?" --to dan`,
      },
    ],
  },
  {
    title: 'Run on its own',
    description: 'Your agent handles its own accounts and reports back.',
    cases: [
      {
        id: 'sign-ups',
        label: 'Sign-ups',
        title: 'Let your agent handle its own sign-ups',
        intro:
          'Your agent signs up for tools with its own address, so verification codes, receipts and invoices stay out of your inbox.',
        points: [
          'Every agent gets an @agentinbox.mx address, or one on your own domain on paid plans.',
          "list --wait holds until the email arrives, so there's no polling.",
          'Services count as strangers: the agent reads their email but never takes instructions from it.',
        ],
        channel: 'email',
        link: { label: 'See it on email', href: '/email' },
        message: { sender: 'from: Acme', text: 'Your verification code is 482 913', time: '10:02 AM' },
        command: `${cli} list --senders all --filter unread --wait --timeout 10m`,
        glow: 'right',
      },
      {
        id: 'reports',
        label: 'Reports',
        title: "Hear about the work when it's done",
        intro:
          "Scheduled runs, CI jobs and long tasks report back where you'll see them. Reply, and the agent reads it the next time it checks.",
        points: [
          'Tell messages send without waiting, so a job never stalls on a report.',
          'Your reply lands in the same conversation.',
          "Background jobs can check for answers that came in while they weren't running.",
        ],
        channel: 'email',
        link: { label: 'See it on email', href: '/email' },
        message: { sender: 'nightly-sync', text: 'Nightly sync finished: 1,204 records, 0 errors.', time: '3:00 AM' },
        command: `${cli} send "Nightly sync finished: 1,204 records, 0 errors."`,
      },
    ],
  },
];

export const USE_CASE_FAQ: readonly FaqItem[] = [
  {
    id: 'agents',
    question: 'Which agents work with Agent Inbox?',
    answer:
      'Claude Code, Codex, OpenCode, Cursor, Hermes, OpenClaw, Claude, ChatGPT and Grok Bot, plus any agent or script that can run a shell command or connect to a remote MCP server.',
    defaultOpen: true,
  },
  {
    id: 'channels',
    question: 'Which channels can my agent use?',
    answer:
      'Email, Telegram and Slack. Each agent gets its own email address, Telegram bot and Slack app. WhatsApp, iMessage and voice are coming next.',
  },
  {
    id: 'response-time',
    question: 'What happens if nobody answers?',
    answer:
      'Every question has a time limit: 24 hours by default, up to 5 days. When it runs out, the question expires and your agent gets that result, so it can take a fallback path instead of waiting forever.',
  },
  {
    id: 'strangers',
    question: 'Can my agent act on any message it receives?',
    answer:
      "No. Messages from people who aren't contacts are information, never instructions. Your agent can reply to them but can't message them first, and you can switch to contacts only so their messages never arrive.",
  },
  {
    id: 'cost',
    question: 'How much does it cost?',
    answer: 'Agent Inbox is free for 100 conversations a month, with no credit card required.',
  },
];
