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

// Questions are from Figma (node 874:9992). Figma only answers the first one.
export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    id: 'what-is-agent-inbox',
    question: 'What is Agent Inbox?',
    answer:
      "Agent Inbox gives every AI agent its own inbox, with a real email address and handles on Slack, Telegram, and iMessage. Your agent can start conversations, handle replies, and keep context across every thread and channel, all through one CLI or API. It's built by Novu, the open-source communication infrastructure behind 1.5B messages a month.",
    defaultOpen: true,
  },
  {
    id: 'what-is-a-conversation',
    question: 'What is a conversation?',
    // Draft copy — not in Figma
    answer:
      'A conversation is a thread between your agent and a person: the first message plus every reply, attachment and reaction that follows. Agent Inbox keeps the full history in one timeline, so your agent has context even when someone switches channels.',
  },
  {
    id: 'compare-agentmail',
    question: 'How Agent Inbox compares to AgentMail?',
    // Draft copy — not in Figma
    answer:
      'Agent Inbox is built around two-way conversations between agents and the people they work with. Each agent gets its own address, can continue the same thread across email, Slack, Telegram, WhatsApp and iMessage, and gets structured responses back, like an approval or a choice. The right fit depends on what your agent needs to do with the replies it receives.',
  },
  {
    id: 'compare-resend',
    question: 'How Agent Inbox compares to Resend?',
    // Draft copy — not in Figma
    answer:
      'Agent Inbox focuses on what happens after your agent sends a message: it receives replies, keeps them in the right thread and turns them into structured responses your agent can act on. Approve, ask, choose and tell are built in, so pausing for a human decision takes a single command.',
  },
  {
    id: 'compare-sendgrid-ses',
    question: 'How Agent Inbox compares to SendGrid/AWS SES?',
    // Draft copy — not in Figma
    answer:
      'Agent Inbox is designed for agents that hold conversations with humans across channels. Alongside email it covers Slack, Telegram, WhatsApp and iMessage, with contacts, conversation history and activity logs in one place, and it is set up with one command: npx @agentinbox/cli setup.',
  },
  {
    id: 'multi-tenant',
    // Figma typo "usec ases" fixed to "use cases".
    question: 'Does Agent Inbox support multi-tenant use cases?',
    // Draft copy — not in Figma
    answer:
      'Yes. Multi-tenancy lets you run many agents, each with its own inbox, across multiple channels. Combine it with custom domains to send from an address your users already trust, and use activity logs to search and monitor every conversation.',
  },
  {
    id: 'is-it-free',
    question: 'Is Agent Inbox free?',
    // Draft copy — not in Figma
    answer:
      'You can start for free with 100 conversations a month, and no credit card is required. Agent Inbox is built by Novu.',
  },
];
