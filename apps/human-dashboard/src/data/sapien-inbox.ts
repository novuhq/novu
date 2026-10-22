import type { SectionAssets } from '@/data/sapien-assets';

export const inboxAssets = {
  hermes: {
    src: '/images/sapien/inbox/hermes.webp',
    width: 120,
    height: 172,
    nodeId: '874:10382',
    purpose: 'Figma 2x render of the Nous Research artwork on the Hermes Agent tile',
  },
  imgIconCheck: {
    src: '/images/sapien/inbox/imgIconCheck.svg',
    width: 12,
    height: 12,
    nodeId: '724:5208',
    purpose: 'Accent check icon on the approval card status row',
  },
  imgIconFile: {
    src: '/images/sapien/inbox/imgIconFile.svg',
    width: 12,
    height: 12,
    nodeId: '724:5229',
    purpose: 'File icon on the message attachment chip',
  },
} satisfies SectionAssets;

export type InboxTag = Readonly<{ label: string; outline?: boolean }>;

export type InboxChannel = Readonly<{ name: string; soon?: boolean }>;

export type InboxThread = Readonly<{
  sender: string;
  time: string;
  preview: string;
  unread?: boolean;
  selected?: boolean;
  tags: readonly InboxTag[];
}>;

export type InboxMessage = Readonly<{
  from: 'agent' | 'contact';
  via: string;
  text?: string;
  approval?: Readonly<{ title: string; description: string; status: string }>;
  attachment?: string;
}>;

export type InboxAgent = Readonly<{
  /** Radix tab value. */
  value: string;
  /** Tab label. */
  label: string;
  handle: string;
  email: string;
  initial: string;
  channels: readonly InboxChannel[];
  threads: readonly InboxThread[];
  conversation: Readonly<{
    contact: string;
    initials: string;
    meta: string;
    messages: readonly InboxMessage[];
  }>;
}>;

export const INBOX_SECTION = {
  title: 'One inbox. Every agent you run',
  // Draft copy — not in Figma (accessible name for the tab list)
  tabsLabel: 'Example agents',
  framework: { name: ['Hermes', 'Agent'], maker: 'by Nous Research.' },
  defaultAgent: 'ops',
} as const;

export const INBOX_LABELS = {
  inbox: 'Inbox',
  contacts: 'Contacts',
  channels: 'Channels',
  unreadFilter: 'Unread',
  soon: 'Soon',
  // Draft copy — not in Figma (screen-reader-only labels)
  unreadCount: 'unread',
  // Draft copy — not in Figma (screen-reader-only labels)
  unreadThread: 'Unread',
  // Draft copy — not in Figma (screen-reader-only labels)
  threadList: 'Conversations',
  // Draft copy — not in Figma (screen-reader-only labels)
  messageList: 'Messages',
  // Draft copy — not in Figma (screen-reader-only labels)
  attachment: 'Attachment:',
} as const;

const CHANNELS: readonly InboxChannel[] = [
  { name: 'Email' },
  { name: 'Slack' },
  { name: 'Telegram' },
  { name: 'WhatsApp', soon: true },
];

export const INBOX_AGENTS: readonly InboxAgent[] = [
  // Draft copy — not in Figma (Personal Assistant tab state)
  {
    value: 'assistant',
    label: 'Personal Assistant',
    handle: 'assistant',
    email: 'assistant@agentinbox.md',
    initial: 'A',
    channels: CHANNELS,
    threads: [
      {
        sender: 'Priya Shah',
        time: '1m',
        preview: 'Approved: Dinner with Lena, Fri',
        selected: true,
        tags: [{ label: 'telegram' }, { label: 'email' }],
      },
      {
        sender: 'Lena Park',
        time: '12m',
        preview: 'Does Friday at 7 still work?',
        unread: true,
        tags: [{ label: 'email' }],
      },
      {
        sender: 'Omar Haddad',
        time: '1h',
        preview: 'Lease draft attached for review',
        unread: true,
        tags: [{ label: 'email' }],
      },
      {
        sender: 'no-reply@acme.dev',
        time: '4h',
        preview: 'Your one-time passcode',
        tags: [{ label: 'email' }, { label: 'anonymous', outline: true }],
      },
    ],
    conversation: {
      contact: 'Priya Shah',
      initials: 'PS',
      meta: 'Owner · Telegram, Email',
      messages: [
        {
          from: 'agent',
          via: 'Telegram',
          approval: {
            title: 'Accept dinner with Lena on Friday?',
            description: '7:00 pm, table for two. Your calendar is free that evening.',
            status: 'Approved by Priya in 18s',
          },
        },
        {
          from: 'contact',
          via: 'Telegram',
          text: 'Perfect. Put it on my calendar',
        },
        {
          from: 'agent',
          via: 'Email',
          text: 'Done. Invite sent to lena@acme.dev.',
          attachment: 'dinner-friday.ics',
        },
      ],
    },
  },
  {
    value: 'ops',
    label: 'Ops Agent',
    handle: 'ops-agent',
    email: 'ops-agent@agentinbox.md',
    initial: 'O',
    channels: CHANNELS,
    threads: [
      {
        sender: 'Maya Chen',
        time: '2m',
        preview: 'Approved: Refund $240 to Acme',
        selected: true,
        tags: [{ label: 'slack' }, { label: 'telegram' }],
      },
      {
        sender: 'Jordan Reyes',
        time: '9m',
        preview: 'Can you resend invoice 4821?',
        unread: true,
        tags: [{ label: 'email' }],
      },
      {
        sender: 'Dan Kim',
        time: '1h',
        preview: 'Is staging back up?',
        unread: true,
        tags: [{ label: 'telegram' }],
      },
      {
        sender: 'verify@acme.dev',
        time: '3h',
        preview: 'Your verification code',
        tags: [{ label: 'email' }, { label: 'anonymous', outline: true }],
      },
    ],
    conversation: {
      contact: 'Maya Chen',
      initials: 'MC',
      meta: 'Contact · Slack, Telegram',
      messages: [
        {
          from: 'agent',
          via: 'Slack',
          approval: {
            title: 'Refund $240 to Acme Corp?',
            description: 'Order 8831 arrived damaged. Customer asked for a full refund.',
            status: 'Approved by Maya in 41s',
          },
        },
        {
          from: 'contact',
          via: 'Telegram',
          text: 'Also send them the receipt please',
        },
        {
          from: 'agent',
          via: 'Telegram',
          text: 'Done. Sent to billing@acme.com.',
          attachment: 'receipt-8831.pdf',
        },
      ],
    },
  },
  // Draft copy — not in Figma (Sales Agent tab state)
  {
    value: 'sales',
    label: 'Sales Agent',
    handle: 'sales-agent',
    email: 'sales-agent@agentinbox.md',
    initial: 'S',
    channels: CHANNELS,
    threads: [
      {
        sender: 'Nina Patel',
        time: '4m',
        preview: 'Approved: 15% off for Globex',
        selected: true,
        tags: [{ label: 'slack' }, { label: 'email' }],
      },
      {
        sender: 'Tom Becker',
        time: '11m',
        preview: 'Can we move the demo to Thu?',
        unread: true,
        tags: [{ label: 'email' }],
      },
      {
        sender: 'Ana Silva',
        time: '48m',
        preview: 'Pricing for a 25-seat team?',
        unread: true,
        tags: [{ label: 'telegram' }],
      },
      {
        sender: 'demo@acme.dev',
        time: '2h',
        preview: 'New demo request from the site',
        tags: [{ label: 'email' }, { label: 'anonymous', outline: true }],
      },
    ],
    conversation: {
      contact: 'Nina Patel',
      initials: 'NP',
      meta: 'Contact · Slack, Email',
      messages: [
        {
          from: 'agent',
          via: 'Slack',
          approval: {
            title: 'Offer Globex 15% off the annual plan?',
            description: 'They’ll sign for 40 seats if we match last quarter’s quote.',
            status: 'Approved by Nina in 52s',
          },
        },
        {
          from: 'contact',
          via: 'Slack',
          text: 'Go for it. Send the order form too',
        },
        {
          from: 'agent',
          via: 'Email',
          text: 'Done. Sent to procurement@globex.dev.',
          attachment: 'order-form-globex.pdf',
        },
      ],
    },
  },
];
