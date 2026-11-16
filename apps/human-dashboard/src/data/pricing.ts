import type { FaqItem } from '@/data/sapien-faq';
import { BOOK_DEMO_HREF } from '@/data/sapien-scale';
import { INBOX_PATH } from '@/lib/inbox';

// The user confirmed the Notion matrix ($10 Pro), overriding its older $30 introductory note.
export type PlanLimits = {
  inboxes: string;
  conversations: string;
  extra: string;
  channels: string;
  domains: string | boolean;
  contacts: boolean;
  integrations: boolean;
  webhooks: boolean;
  branding: string;
  security: boolean;
};

export type PricingPlan = {
  id: 'hobby' | 'pro' | 'enterprise';
  name: string;
  price: string;
  period?: string;
  description: string;
  action: string;
  href: string;
  limits: PlanLimits;
};

export const PRICING_PLANS: readonly PricingPlan[] = [
  {
    id: 'hobby',
    name: 'Hobby',
    price: '$0',
    period: '/month',
    description: 'Start with your first agent inbox.',
    action: 'Start for free',
    href: INBOX_PATH,
    limits: {
      inboxes: '1',
      conversations: '100',
      extra: 'Hard stop',
      channels: '2',
      domains: false,
      contacts: true,
      integrations: true,
      webhooks: true,
      branding: 'Shown',
      security: false,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$10',
    period: '/month',
    description: 'More room for your agents to work.',
    action: 'Get started',
    href: INBOX_PATH,
    limits: {
      inboxes: '10',
      conversations: '500',
      extra: '$0.02 each',
      channels: 'All supported',
      domains: '1',
      contacts: true,
      integrations: true,
      webhooks: true,
      branding: 'Removable',
      security: false,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    description: 'Capacity and terms built around you.',
    action: 'Talk to us',
    href: BOOK_DEMO_HREF,
    limits: {
      inboxes: 'Custom',
      conversations: 'Custom volume',
      extra: 'Custom',
      channels: 'Custom',
      domains: 'Custom',
      contacts: true,
      integrations: true,
      webhooks: true,
      branding: 'Removable',
      security: true,
    },
  },
];

export const PRICING_FEATURES: readonly { key: keyof PlanLimits; label: string }[] = [
  { key: 'inboxes', label: 'Agent inboxes' },
  { key: 'conversations', label: 'Active conversations / month' },
  { key: 'extra', label: 'Extra conversations' },
  { key: 'channels', label: 'Connected channels' },
  { key: 'domains', label: 'Custom email domains' },
  { key: 'contacts', label: 'Contacts & invitations' },
  { key: 'integrations', label: 'CLI, MCP, SDK & API' },
  { key: 'webhooks', label: 'Human-in-the-loop & webhooks' },
  { key: 'branding', label: 'Powered by Novu branding' },
  { key: 'security', label: 'Enterprise security & SLA' },
];

export const CONVERSATION_RULES = [
  {
    title: 'Activity starts the clock',
    description:
      'A conversation starts when an agent reads an incoming message or successfully sends one. Every message, reply and decision in that thread and channel stays in the same 24-hour window.',
  },
  {
    title: 'A fixed window, not a moving target',
    description:
      'Activity after 24 hours starts a new conversation. Resolving or reopening a thread does not reset the clock. Separate threads or channels count separately.',
  },
  {
    title: 'Counted when it starts',
    description:
      'Usage belongs to the billing cycle in which the window starts. Unread messages, blocked spam, failed sends and setup tests do not count.',
  },
] as const;

export const CONVERSATION_EXAMPLES = [
  { example: '80 Slack messages within 24 hours', count: '1', unit: 'conversation' },
  { example: 'An approval request answered 3 hours later', count: '1', unit: 'conversation' },
  { example: 'The same email thread active again 3 days later', count: '2', unit: 'total' },
  { example: 'An agent reads a verification email', count: '1', unit: 'conversation' },
  { example: 'An agent messages 10 different contacts', count: '10', unit: 'conversations' },
  { example: '100 unread or blocked emails', count: '0', unit: 'conversations' },
] as const;

export const PRICING_FAQ: readonly FaqItem[] = [
  {
    id: 'conversations-not-messages',
    question: 'Why conversations instead of messages?',
    answer:
      'Agents need to finish tasks. A conversation covers the full exchange with a person or service, rather than charging for each message. Ten replies and an approval can still be one conversation when they share a thread, channel and 24-hour window. Your conversation allowance is not a message cap.',
    defaultOpen: true,
  },
  {
    id: 'connected-channels',
    question: 'What counts as a channel?',
    answer:
      'One email identity, Telegram bot or Slack workspace connection. Multiple Slack threads in one workspace do not count as extra channels. Multiple agent clients connected to the same inbox do not count as extra inboxes.',
  },
  {
    id: 'usage-limits',
    question: 'What happens when I hit my limit?',
    answer:
      'On Hobby, new billable activity is restricted until your allowance resets or you upgrade; incoming mail remains queued. On Pro, extra conversations cost $0.02 each, subject to spending and safety limits. Enterprise has custom allowances.',
  },
  {
    id: 'outbound-permission',
    question: 'Can agents message anyone?',
    answer:
      'Outbound communication follows contact verification, consent, screening and provider policies. Higher plans increase capacity, not permission to spam.',
  },
];
