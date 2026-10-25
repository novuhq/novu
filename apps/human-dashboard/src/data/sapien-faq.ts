import type { SectionAssets } from '@/data/sapien-assets';

export const faqAssets = {
  imgFrame: {
    src: '/images/sapien/faq/imgFrame.svg',
    width: 24,
    height: 24,
    nodeId: '874:10007',
    purpose: "Orange plus icon of an FAQ row; clipped to its horizontal arms it is Figma's open-state minus (874:9997)",
  },
} satisfies SectionAssets;

export const FAQ_HEADING = {
  lead: 'Questions,',
  rest: 'answers',
} as const;

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  /** Rendered expanded on load (Figma shows the first question open). */
  defaultOpen?: boolean;
};

export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    id: 'what-is-agent-inbox',
    question: 'What is AgentInbox?',
    answer:
      'AgentInbox is an inbox for AI agents. It gives your agent its own email address and connects it to Slack, Telegram, WhatsApp and iMessage to receive messages, start conversations, ask for approvals or choice, and handle replies.',
    defaultOpen: true,
  },
  {
    id: 'which-ai-tools',
    question: 'Which AI tools can use AgentInbox?',
    answer:
      'Agents that run terminal commands can use the CLI. Compatible apps can connect through MCP. Official skills are available for coding agents such as Claude Code, Codex, Grok Bot and Cursor.',
  },
  {
    id: 'contact-directly',
    question: 'Can people and services contact my agent directly?',
    answer:
      'Yes. People can message your agent through its connected channels, and services can send email to its address. Your account settings control who can reach it.',
  },
  {
    id: 'human-approvals',
    question: 'How do human approvals work?',
    answer:
      'Your agent sends an approval request to a contact. The contact approves or denies it, and AgentInbox returns the result. Your agent or application uses that result to decide whether to continue.',
  },
  {
    id: 'kept-between-runs',
    question: 'Are conversations kept between agent runs?',
    answer:
      'Yes. Your connected agent can read earlier messages and replies before continuing the work. Each conversation stays associated with its original channel.',
  },
  {
    id: 'get-an-inbox',
    question: 'How do I get my agent an Inbox?',
    answer:
      'Run npx @agentinbox/cli setup. You get an inbox that receives email straight away, with no account needed. When you want your agent to send, claim the inbox with a new or existing account, and you keep the address, threads and contacts. You can also sign up on agentinbox.md, or install the skills with npx skills add agentinboxhq/skills.',
  },
  {
    id: 'who-can-message',
    question: 'Who can message my agent?',
    answer:
      "You choose: anyone, or contacts only. Messages from unknown or suspicious senders are screened and held, so they never reach your agent silently. Add people with an invite link; they verify on email, Telegram or Slack. Your agent's own outbound messages follow the same rules: a new email address has to verify before your agent's message reaches it.",
  },
];
