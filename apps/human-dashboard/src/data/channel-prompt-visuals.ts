import type { AgentId, ChannelId } from './channel-pages';

/*
 * What the illustration on each "Try these prompts" card shows: the message the agent sends on the channel
 * (or receives) when you use that prompt. Illustration copy only, not in the content spec; one entry per
 * prompt, in the order the prompts appear on the page.
 */

export type PromptVisual =
  /** The agent asks for a yes or no: Approve and Deny buttons, Approve chosen. */
  | { kind: 'approve'; message: string }
  /** The agent offers options as buttons; `picked` is the one chosen. */
  | { kind: 'choose'; message: string; options: string[]; picked: number }
  /** The agent asks a question and a person replies. `from` names who replies; you, when left out. */
  | { kind: 'ask'; message: string; reply: string; from?: string }
  /** The agent sends an update that needs no answer. */
  | { kind: 'tell'; message: string }
  /** You send a message with `listen` on, and the agent replies when it's done. */
  | { kind: 'listen'; message: string; reply: string }
  /** A message someone sent the agent. */
  | { kind: 'received'; from: string; message: string };

type Visuals = readonly [PromptVisual, PromptVisual, PromptVisual];

const EMAIL: Record<AgentId, Visuals> = {
  'claude-code': [
    { kind: 'approve', message: 'Run the users table migration on production?' },
    {
      kind: 'ask',
      message: 'The auth tests still fail after two tries. The session mock returns null. What should I try next?',
      reply: 'Stub the clock and rerun.',
    },
    { kind: 'tell', message: 'Refactor done: 14 files changed, all tests pass.' },
  ],
  codex: [
    { kind: 'approve', message: 'Push 3 commits to main?' },
    {
      kind: 'choose',
      message: 'The API change breaks the mobile client. How should I handle it?',
      options: ['Add a v2 route', 'Patch the client'],
      picked: 0,
    },
    { kind: 'tell', message: 'Done: renamed the billing module and updated 9 imports.' },
  ],
  opencode: [
    { kind: 'approve', message: 'Delete 4 files in scripts/?' },
    { kind: 'choose', message: 'Which fix should I keep?', options: ['Retry loop', 'Longer timeout'], picked: 0 },
    { kind: 'tell', message: 'Build finished: passed in 2m 14s.' },
  ],
  cursor: [
    { kind: 'approve', message: 'Edit 3 files in the payments module?' },
    {
      kind: 'ask',
      message: "The spec doesn't say how refunds round. Up or down?",
      reply: 'Round down to the cent.',
    },
    { kind: 'tell', message: 'Done: added CSV export and 6 tests.' },
  ],
  hermes: [
    { kind: 'tell', message: 'Overnight research done: 42 sources, 5 key findings.' },
    { kind: 'received', from: 'Acme Trial', message: 'Your verification code is 482913.' },
    { kind: 'approve', message: 'Buy the $29 monthly plan for the scraping API?' },
  ],
  openclaw: [
    { kind: 'approve', message: 'Pay invoice #2231 from Figma, $540?' },
    {
      kind: 'choose',
      message: 'Three tables are free on Friday. Which one?',
      options: ['19:00', '19:30', '20:15'],
      picked: 1,
    },
    { kind: 'received', from: 'Weekly Digest', message: 'Confirm your subscription to the newsletter.' },
  ],
  claude: [
    { kind: 'ask', message: 'Which day works for the review?', reply: 'Thursday works.', from: 'Sam' },
    { kind: 'received', from: 'Sam', message: 'Thursday works for the review.' },
    { kind: 'approve', message: 'Approve the Q3 budget before it goes out?' },
  ],
  chatgpt: [
    { kind: 'ask', message: 'Is the venue confirmed?', reply: 'Yes, signed this morning.', from: 'Priya' },
    { kind: 'received', from: 'Priya', message: 'The venue is confirmed for the 12th.' },
    { kind: 'approve', message: "Approve the agenda for Monday's offsite?" },
  ],
  'grok-bot': [
    { kind: 'approve', message: 'Send the reply to Acme on your behalf?' },
    {
      kind: 'choose',
      message: 'Found three laptops under $1,500. Which one?',
      options: ['13-inch', '14-inch', '16-inch'],
      picked: 1,
    },
    { kind: 'tell', message: 'The report is ready.' },
  ],
  'any-agent': [
    { kind: 'approve', message: 'Delete 342 records older than 90 days?' },
    {
      kind: 'choose',
      message: 'Which region should I deploy to?',
      options: ['us-east', 'eu-west', 'ap-south'],
      picked: 1,
    },
    { kind: 'tell', message: 'Backup failed: disk full on db-2.' },
  ],
};

const TELEGRAM: Record<AgentId, Visuals> = {
  'claude-code': [
    {
      kind: 'listen',
      message: 'Fix the failing test in auth and open a PR.',
      reply: 'Fixed the token expiry check. PR #482 is open.',
    },
    { kind: 'approve', message: 'Push 2 commits to main?' },
    {
      kind: 'choose',
      message: 'Two ways to fix the cache. Which one?',
      options: ['Shorter TTL', 'Purge on write'],
      picked: 1,
    },
  ],
  codex: [
    { kind: 'approve', message: 'Run the data backfill on 1.2M rows?' },
    {
      kind: 'choose',
      message: 'Two refund tests contradict each other. Which one is right?',
      options: ['Full refund', 'Partial refund'],
      picked: 1,
    },
    { kind: 'tell', message: 'PR #318 is ready for review: adds rate limits to the API.' },
  ],
  opencode: [
    { kind: 'approve', message: 'Rewrite the migrations folder?' },
    { kind: 'tell', message: '3 failing tests: auth.login, auth.refresh, billing.invoice.' },
    {
      kind: 'choose',
      message: 'What should the new module be called?',
      options: ['ledger', 'billing', 'payments'],
      picked: 0,
    },
  ],
  cursor: [
    { kind: 'approve', message: 'Delete 12 old components?' },
    { kind: 'tell', message: 'Build broke: type error in Header.tsx, line 42.' },
    { kind: 'choose', message: 'Which layout should I build?', options: ['Grid', 'List', 'Cards'], picked: 2 },
  ],
  hermes: [
    { kind: 'approve', message: 'Publish the weekly report?' },
    { kind: 'ask', message: 'Is staging back up?', reply: 'Yes, since 10:20.', from: 'Ana' },
    { kind: 'tell', message: 'Crawl finished: 8,412 pages.' },
  ],
  openclaw: [
    { kind: 'approve', message: 'Pay invoice #2231 from Figma, $540?' },
    {
      kind: 'choose',
      message: 'Three tables are free on Friday. Which one?',
      options: ['19:00', '19:30', '20:15'],
      picked: 1,
    },
    { kind: 'tell', message: 'Nightly scrape done: 1,240 pages, 0 errors.' },
  ],
  claude: [
    { kind: 'ask', message: "Can you cover Friday's shift?", reply: 'Yes, I can.', from: 'Ana' },
    { kind: 'received', from: 'Leo', message: 'The delivery came in this morning.' },
    { kind: 'choose', message: 'Which time works for you?', options: ['10am', '2pm', '4pm'], picked: 1 },
  ],
  chatgpt: [
    { kind: 'ask', message: 'Did the delivery arrive?', reply: 'Yes, an hour ago.', from: 'Priya' },
    { kind: 'received', from: 'Sam', message: 'Still waiting on the signed contract.' },
    { kind: 'approve', message: 'Approve the $120 refund?' },
  ],
  'grok-bot': [
    { kind: 'approve', message: 'Post the thread to your account?' },
    { kind: 'choose', message: 'Which draft should I go with?', options: ['Draft 1', 'Draft 2', 'Draft 3'], picked: 1 },
    { kind: 'tell', message: 'Done: the research summary is ready.' },
  ],
  'any-agent': [
    { kind: 'approve', message: 'Tag release v2.5.0?' },
    { kind: 'tell', message: 'Disk usage on db-1 is at 91%.' },
    {
      kind: 'choose',
      message: 'Which backup should I restore?',
      options: ['May 12', 'May 13', 'May 14'],
      picked: 2,
    },
  ],
};

const SLACK: Record<AgentId, Visuals> = {
  'claude-code': [
    { kind: 'approve', message: 'Deploy v2.4 to production?' },
    {
      kind: 'listen',
      message: 'Look into the flaky checkout test and reply here.',
      reply: 'The test races the payment mock. The fix is on fix/checkout-flake.',
    },
    { kind: 'tell', message: 'Migration finished: 3 tables updated.' },
  ],
  codex: [
    { kind: 'approve', message: 'Merge the schema change for orders?' },
    {
      kind: 'choose',
      message: 'v1 and v2 of the orders endpoint conflict. Which should I keep?',
      options: ['Keep v1', 'Keep v2'],
      picked: 1,
    },
    { kind: 'tell', message: 'Refactor landed: auth now lives in its own package.' },
  ],
  opencode: [
    { kind: 'approve', message: 'Delete the deprecated legacy-utils package?' },
    {
      kind: 'ask',
      message: 'Which test fixtures are still used?',
      reply: 'Only users.json and orders.json.',
      from: 'Dan',
    },
    { kind: 'tell', message: 'Release build v2.4 is ready.' },
  ],
  cursor: [
    { kind: 'approve', message: 'Edit 3 files in the payments module?' },
    {
      kind: 'ask',
      message: 'How is the auth middleware supposed to work?',
      reply: 'It checks the session, then the role.',
      from: 'Maya',
    },
    { kind: 'tell', message: 'PR #91 is ready for review.' },
  ],
  hermes: [
    { kind: 'approve', message: 'Publish the weekly report?' },
    { kind: 'tell', message: 'Competitor price check: 2 prices changed this week.' },
    { kind: 'choose', message: 'Which draft should we send?', options: ['Draft A', 'Draft B', 'Draft C'], picked: 0 },
  ],
  openclaw: [
    { kind: 'approve', message: 'Pay the Northwind invoice, $1,200?' },
    {
      kind: 'choose',
      message: 'Which dates work for the offsite?',
      options: ['Jun 3-4', 'Jun 10-11', 'Jun 17-18'],
      picked: 1,
    },
    { kind: 'tell', message: 'Expense report filed: $412.60.' },
  ],
  claude: [
    { kind: 'ask', message: 'When is the launch date?', reply: 'June 12.', from: 'Dan' },
    { kind: 'approve', message: 'Approve the press release?' },
    { kind: 'received', from: 'Priya', message: 'Any update on the contract?' },
  ],
  chatgpt: [
    { kind: 'ask', message: 'Did the invoices go out?', reply: 'Yes, all 14 this morning.', from: 'Leo' },
    { kind: 'approve', message: 'Approve a 10% discount for Acme?' },
    { kind: 'received', from: 'Dan', message: 'Can we move the sync to 3pm?' },
  ],
  'grok-bot': [
    { kind: 'approve', message: 'Send this reply to the customer?' },
    { kind: 'choose', message: 'Which draft should I use?', options: ['Draft A', 'Draft B'], picked: 1 },
    { kind: 'tell', message: 'Research done: the summary is ready.' },
  ],
  'any-agent': [
    { kind: 'approve', message: 'Scale the database down to 2 nodes?' },
    { kind: 'tell', message: 'Data export is ready: 48,210 rows.' },
    {
      kind: 'choose',
      message: 'Which feature flag should I turn on?',
      options: ['new-checkout', 'dark-mode', 'beta-search'],
      picked: 0,
    },
  ],
};

const VISUALS: Record<ChannelId, Record<AgentId, Visuals>> = { email: EMAIL, telegram: TELEGRAM, slack: SLACK };

export function promptVisuals(channel: ChannelId, agent: AgentId): Visuals {
  return VISUALS[channel][agent];
}

/** The hub's Choose and Tell tabs, drawn with the same card, from each hub's own example. */
export const HUB_VISUALS: Record<ChannelId, { choose: PromptVisual; tell: PromptVisual }> = {
  email: {
    choose: { kind: 'choose', message: 'Which flight?', options: ['9:00 AM', '1:00 PM'], picked: 1 },
    tell: { kind: 'tell', message: 'Nightly build passed. 0 failures.' },
  },
  telegram: {
    choose: { kind: 'choose', message: 'Where should we eat?', options: ['Ramen bar', 'Taco place'], picked: 0 },
    tell: { kind: 'tell', message: 'Scrape finished: 1,204 rows' },
  },
  slack: {
    choose: { kind: 'choose', message: 'Which environment?', options: ['Staging', 'Production'], picked: 0 },
    tell: { kind: 'tell', message: 'Release v2.4 is live' },
  },
};
