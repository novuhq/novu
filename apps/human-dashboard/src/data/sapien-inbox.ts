import type { BrandChannel } from '@/components/sapien/brand-logo';
import type { HostId } from '@/lib/hosts';

export type InboxChannel = Readonly<{ channel: BrandChannel; soon?: boolean }>;

/** One key of the conversation as the agent reads it, in the same shape on every channel. */
export type InboxField = Readonly<{ key: string; value: string }>;

/**
 * A row of the example inbox. A person sees `preview` on their own app; under it, the agent reads `reads`,
 * which keeps the same keys whichever channel the message came in on.
 */
export type InboxThread = Readonly<{
  id: string;
  sender: string;
  via: BrandChannel;
  time: string;
  preview: string;
  unread?: boolean;
  reads: readonly InboxField[];
}>;

export type InboxAgent = Readonly<{
  /** Radix tab value. */
  value: string;
  /** Tab label. */
  label: string;
  email: string;
  /** The agent runtime it lives in, for its logo and name. */
  host: HostId;
  threads: readonly InboxThread[];
}>;

export const INBOX_SECTION = {
  // Draft copy — not in Figma
  index: '01',
  label: 'The inbox',
  title: { lead: 'One inbox.', accent: 'Every channel.' },
  description: 'People write from Slack, email or Telegram. Your agent reads one shape. Hover to peek.',
  // Draft copy — not in Figma (accessible name for the tab list)
  tabsLabel: 'Example agents',
  defaultAgent: 'ops',
} as const;

// Draft copy — not in Figma
export const INBOX_LABELS = {
  live: 'Live',
  channels: 'Channels',
  soon: 'Soon',
  human: 'What people see',
  agent: 'What the agent reads',
  peek: 'Hover a message to peek',
  // Screen-reader-only labels
  inbox: 'Inbox',
  unreadThread: 'New',
} as const;

export const INBOX_CHANNELS: readonly InboxChannel[] = [
  { channel: 'email' },
  { channel: 'slack' },
  { channel: 'telegram' },
  { channel: 'whatsapp', soon: true },
  { channel: 'imessage', soon: true },
];

export const INBOX_AGENTS: readonly InboxAgent[] = [
  // Draft copy — not in Figma
  {
    value: 'assistant',
    label: 'Personal Assistant',
    email: 'assistant@agentinbox.md',
    host: 'grok',
    threads: [
      {
        id: 'conv_friday',
        sender: 'Priya Shah',
        via: 'telegram',
        time: '1m',
        preview: 'Yes, book dinner with Lena on Friday',
        reads: [
          { key: 'kind', value: 'approve' },
          { key: 'answer', value: 'approved' },
          { key: 'after', value: '18s' },
        ],
      },
      {
        id: 'conv_lena',
        sender: 'Lena Park',
        via: 'email',
        time: '12m',
        preview: 'Does Friday at 7 still work?',
        unread: true,
        reads: [
          { key: 'kind', value: 'ask' },
          { key: 'when', value: 'fri 19:00' },
        ],
      },
      {
        id: 'conv_omar',
        sender: 'Omar Haddad',
        via: 'slack',
        time: '1h',
        preview: 'Lease draft is ready for review',
        unread: true,
        reads: [
          { key: 'kind', value: 'tell' },
          { key: 'files', value: '1' },
        ],
      },
      {
        id: 'conv_otp',
        sender: 'no-reply@acme.dev',
        via: 'email',
        time: '4h',
        preview: 'Your one-time passcode',
        reads: [
          { key: 'contact', value: 'false' },
          { key: 'held', value: 'true' },
        ],
      },
    ],
  },
  {
    value: 'ops',
    label: 'Ops Agent',
    email: 'ops-agent@agentinbox.md',
    host: 'hermes',
    threads: [
      {
        id: 'conv_8831',
        sender: 'Maya Chen',
        via: 'slack',
        time: '2m',
        preview: 'Approved. Take the $240 refund',
        reads: [
          { key: 'kind', value: 'approve' },
          { key: 'answer', value: 'approved' },
          { key: 'after', value: '41s' },
        ],
      },
      {
        id: 'conv_4821',
        sender: 'Jordan Reyes',
        via: 'email',
        time: '9m',
        preview: 'Can you resend invoice 4821?',
        unread: true,
        reads: [
          { key: 'kind', value: 'ask' },
          { key: 'ref', value: 'invoice_4821' },
        ],
      },
      {
        id: 'conv_staging',
        sender: 'Dan Kim',
        via: 'telegram',
        time: '1h',
        preview: 'Is staging back up?',
        unread: true,
        reads: [
          { key: 'kind', value: 'ask' },
          { key: 'reply_on', value: 'telegram' },
        ],
      },
      {
        id: 'conv_verify',
        sender: 'verify@acme.dev',
        via: 'email',
        time: '3h',
        preview: 'Your verification code',
        reads: [
          { key: 'contact', value: 'false' },
          { key: 'held', value: 'true' },
        ],
      },
    ],
  },
  // Draft copy — not in Figma
  {
    value: 'sales',
    label: 'Sales Agent',
    email: 'sales-agent@agentinbox.md',
    host: 'claude-code',
    threads: [
      {
        id: 'conv_northwind',
        sender: 'Nina Patel',
        via: 'slack',
        time: '4m',
        preview: 'Go ahead with 15% off the renewal',
        reads: [
          { key: 'kind', value: 'approve' },
          { key: 'answer', value: 'approved' },
          { key: 'after', value: '52s' },
        ],
      },
      {
        id: 'conv_demo',
        sender: 'Tom Becker',
        via: 'email',
        time: '11m',
        preview: 'Can we move the demo to Thursday?',
        unread: true,
        reads: [
          { key: 'kind', value: 'ask' },
          { key: 'when', value: 'thu' },
        ],
      },
      {
        id: 'conv_pricing',
        sender: 'Ana Silva',
        via: 'telegram',
        time: '48m',
        preview: 'Pricing for a 25-seat team?',
        unread: true,
        reads: [
          { key: 'kind', value: 'ask' },
          { key: 'seats', value: '25' },
        ],
      },
      {
        id: 'conv_lead',
        sender: 'demo@acme.dev',
        via: 'email',
        time: '2h',
        preview: 'New demo request from the site',
        reads: [
          { key: 'contact', value: 'false' },
          { key: 'held', value: 'true' },
        ],
      },
    ],
  },
];
