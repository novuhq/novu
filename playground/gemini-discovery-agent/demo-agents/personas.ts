// Canned department agents for the Discovery Agent demo. Answers are fixed; the point is distinct
// topics for routing, plus one follow-up question per agent to show multi-turn forwarding.
import type { AgentCard } from '@a2a-js/sdk';

export type Intent = {
  match: RegExp;
  /** Asked when the message lacks the detail; the next message on the same context answers it. */
  ask?: { question: string; find: (text: string) => string | undefined };
  answer: (detail?: string) => string;
};

export type Persona = {
  id: string;
  name: string;
  description: string;
  skill: { id: string; name: string; description: string; tags: string[]; examples: string[] };
  intents: Intent[];
  fallback: string;
};

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const capitalize = (value: string) => value[0].toUpperCase() + value.slice(1);

function findWord(text: string, words: string[]): string | undefined {
  const lower = text.toLowerCase();
  const found = words.find((word) => new RegExp(`\\b${word}\\b`).test(lower));

  return found ? capitalize(found) : undefined;
}

const LEAVE: Record<string, string> = {
  Parental:
    'Parental leave is 16 weeks fully paid for every parent, taken within 12 months of the birth or adoption. Tell your manager at least 8 weeks ahead.',
  Maternity: 'Maternity leave is 16 weeks fully paid, plus up to 8 more weeks at 50% pay.',
  Paternity: 'Paternity leave is 16 weeks fully paid, taken within 12 months of the birth.',
  Sick: 'Sick leave is fully paid for up to 20 days a year. From day 3 of an absence, send a doctor’s note to people@example.com.',
  Unpaid: 'Unpaid leave of up to 3 months can be approved by your manager and People team. Benefits continue during it.',
};

const sales: Persona = {
  id: 'sales',
  name: 'Sales Agent (A2A)',
  description:
    'Answers questions about company sales: monthly sales figures. Asks which month if the question does not name one.',
  skill: {
    id: 'sales-lookup',
    name: 'Sales lookup',
    description: 'Monthly sales figures.',
    tags: ['sales'],
    examples: ['What were sales?', 'What were sales in March?'],
  },
  intents: [
    {
      match: /sales|sold/i,
      ask: { question: 'Which month?', find: (text) => findWord(text, MONTHS) },
      answer: (month) => `Sales for ${month}: $42,000.`,
    },
  ],
  fallback: 'I’m the Sales agent. Ask me for monthly sales figures, for example "What were sales in March?"',
};

const people: Persona = {
  id: 'people',
  name: 'People Agent (A2A)',
  description:
    'HR questions: your time-off balance, leave policies (parental, sick, unpaid), benefits and payroll dates. Asks which kind of leave if the question does not say.',
  skill: {
    id: 'hr-questions',
    name: 'HR questions',
    description: 'Time off, leave policies, benefits and payroll dates.',
    tags: ['hr', 'people', 'time off'],
    examples: ['How many vacation days do I have left?', 'What is the leave policy?', 'When is payday?'],
  },
  intents: [
    {
      match: /time off|pto|vacation|holiday|days off|leave balance|days left/i,
      answer: () =>
        'You have 14 days of paid time off left for 2026, plus 2 floating holidays. Up to 5 unused days roll over to 2027.',
    },
    {
      match: /leave|parental|maternity|paternity|sick/i,
      ask: {
        question: 'Which kind of leave: parental, sick, or unpaid?',
        find: (text) => findWord(text, ['parental', 'maternity', 'paternity', 'sick', 'unpaid']),
      },
      answer: (kind) => LEAVE[kind ?? ''] ?? LEAVE.Parental,
    },
    {
      match: /payroll|payday|salary|pay ?slip/i,
      answer: () => 'Payroll runs on the 25th of each month. Your October payslip will be in Workday on October 23.',
    },
    {
      match: /benefit|insurance|health|dental|gym|wellness/i,
      answer: () =>
        'Your benefits: private health and dental cover for you and your family, a €50 monthly wellness allowance, and a €1,000 yearly learning budget. Enrollment changes open in November.',
    },
  ],
  fallback: 'I’m the People agent. I can help with time off, leave policies, benefits and payroll dates.',
};

const SYSTEMS = ['Salesforce', 'GitHub', 'Jira', 'Figma', 'Notion', 'AWS', 'GCP', 'Looker', 'Workday', 'Slack'];
const findSystem = (text: string) => SYSTEMS.find((system) => new RegExp(`\\b${system}\\b`, 'i').test(text));

const itHelpdesk: Persona = {
  id: 'it_helpdesk',
  name: 'IT Helpdesk (A2A)',
  description:
    'IT support: VPN problems, laptop issues, password resets and access requests to internal systems (GitHub, Salesforce, Jira…). Opens tickets, and asks which system when an access request does not name one.',
  skill: {
    id: 'it-support',
    name: 'IT support',
    description: 'VPN, laptops, password resets and access requests.',
    tags: ['it', 'helpdesk', 'access'],
    examples: ['My VPN keeps disconnecting', 'I need access', 'Reset my password'],
  },
  intents: [
    {
      match: /password|locked out|reset|2fa|mfa/i,
      answer: () =>
        'Reset it at id.example.com/reset; you’ll get a code on your phone. If you’re locked out after 5 attempts, the lock clears after 15 minutes.',
    },
    {
      match: /vpn/i,
      answer: () =>
        'Known issue since 09:00: the EU VPN gateway is overloaded. Switch GlobalProtect to the eu-west-2 portal for now. I added you to ticket IT-4817 so you get the all-clear.',
    },
    {
      match: /laptop|computer|macbook|screen|keyboard|battery|charger/i,
      answer: () =>
        'I opened ticket IT-4822 for your laptop. Bring it to the IT desk on floor 3; a loaner is ready if the repair takes more than a day.',
    },
    {
      match: /access|permission|licen[cs]e|seat|add me/i,
      ask: { question: 'Which system do you need access to?', find: findSystem },
      answer: (system) =>
        `Access request IT-4830 opened for ${system}. Your manager gets an approval email; access usually lands within 2 hours of approval.`,
    },
  ],
  fallback: 'I’m the IT Helpdesk. I can help with VPN, laptops, password resets and access requests.',
};

const finance: Persona = {
  id: 'finance',
  name: 'Finance Agent (A2A)',
  description:
    'Finance questions: expense report status and reimbursements, team budgets and spend, vendor invoices, and company revenue. Asks which report if an expense question does not say.',
  skill: {
    id: 'finance-questions',
    name: 'Finance questions',
    description: 'Expenses, budgets, invoices and revenue.',
    tags: ['finance', 'expenses', 'budget'],
    examples: ['Was my expense report approved?', 'How much of our travel budget is left?', 'What was revenue last quarter?'],
  },
  intents: [
    {
      match: /expense|reimburs/i,
      ask: {
        question: 'Which expense report? Give the month or the report number.',
        find: (text) => findWord(text, MONTHS) ?? text.match(/\bER-?\d+\b/i)?.[0].toUpperCase(),
      },
      answer: (report) =>
        `Expense report for ${report}: approved on September 24. €1,240 will be paid out with the October 25 payroll.`,
    },
    {
      match: /budget|spend|spent|cost/i,
      answer: () =>
        'Your team’s Q3 travel budget is €18,000: €11,450 spent (64%) and €3,200 more in approved requests, which leaves €3,350.',
    },
    {
      match: /invoice|vendor|supplier/i,
      answer: () =>
        'Vendor invoices are paid net 30. Send new ones to ap@example.com; Accounts Payable confirms within 2 business days.',
    },
    {
      match: /revenue|bookings|arr\b/i,
      answer: () => 'Revenue was $1.14M in Q2 2026, up 9% on Q1. ARR is $4.8M.',
    },
  ],
  fallback: 'I’m the Finance agent. I can help with expense reports, budgets, invoices and revenue.',
};

const QUARTERS: Record<string, string> = {
  Q1: 'Q1 2026: revenue $1.05M (+6% on Q4 2025), 241 new customers, churn 2.9%, NPS 41. The Starter plan price change drove most of the growth.',
  Q2: 'Q2 2026: revenue $1.14M (+9% on Q1), 264 new customers, churn 2.6%, NPS 44. Enterprise upgrades drove most of the growth; churn is concentrated in monthly Starter plans.',
  Q3: 'Q3 2026 closes today, so these are preliminary: revenue about $1.28M (+12% on Q2), 312 new customers, churn 2.1%, NPS 46.',
  Q4: 'Q4 2026 hasn’t started yet. The plan targets $1.4M revenue and churn under 2%.',
};

function findQuarter(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (/\blast quarter\b/.test(lower)) return 'Q2';
  if (/\b(this|current) quarter\b/.test(lower)) return 'Q3';
  const byNumber = lower.match(/\bq([1-4])\b/)?.[1];
  if (byNumber) return `Q${byNumber}`;
  const ordinal = ['first', 'second', 'third', 'fourth'].findIndex((word) => new RegExp(`\\b${word}\\b`).test(lower));

  return ordinal >= 0 ? `Q${ordinal + 1}` : undefined;
}

const analyst: Persona = {
  id: 'analyst',
  name: 'Analyst Agent (A2A)',
  description:
    'Business analyst: quarterly business summaries and KPIs (revenue growth, new customers, churn, NPS) and what drove them. Asks which quarter if the question does not name one.',
  skill: {
    id: 'business-analysis',
    name: 'Business analysis',
    description: 'Quarterly summaries, KPIs, churn and customer growth.',
    tags: ['analytics', 'kpi', 'quarterly'],
    examples: ['Summarise last quarter', 'How is churn trending?', 'How many new customers did we get?'],
  },
  intents: [
    {
      match: /churn|retention/i,
      answer: () =>
        'Churn is trending down: 2.9% in Q1, 2.6% in Q2, about 2.1% in Q3. Most of it is monthly Starter plans in their first 90 days.',
    },
    {
      match: /customers?|sign ?ups|logos/i,
      answer: () => '264 new customers in Q2 (+10% on Q1), 38 of them on the Enterprise plan. Q3 is tracking at about 312.',
    },
    {
      match: /summar|overview|kpi|metric|report|performance|how did we do|trend|quarter/i,
      ask: { question: 'Which quarter? For example Q2 or last quarter.', find: findQuarter },
      answer: (quarter) => QUARTERS[quarter ?? ''] ?? QUARTERS.Q2,
    },
  ],
  fallback: 'I’m the Analyst agent. Ask me for a quarterly summary, KPIs, churn or customer growth.',
};

export const PERSONAS: Record<string, Persona> = Object.fromEntries(
  [sales, people, itHelpdesk, finance, analyst].map((persona) => [persona.id, persona])
);

export function agentCardFor(persona: Persona, url: string): AgentCard {
  return {
    protocolVersion: '0.3.0',
    name: persona.name,
    description: persona.description,
    url,
    preferredTransport: 'JSONRPC',
    additionalInterfaces: [
      { url, transport: 'JSONRPC' },
      { url, transport: 'HTTP+JSON' },
    ],
    version: '1.0.0',
    capabilities: { streaming: true, pushNotifications: false, stateTransitionHistory: false },
    defaultInputModes: ['text/plain'],
    defaultOutputModes: ['text/plain'],
    skills: [persona.skill],
  };
}

export type Reply = { kind: 'ask'; text: string; intent: number } | { kind: 'answer'; text: string };

/** `pendingIntent` is the intent whose question the previous turn on this context asked. */
export function respond(persona: Persona, text: string, pendingIntent?: number): Reply {
  const matched = persona.intents.findIndex((intent) => intent.match.test(text));
  const pending = pendingIntent === undefined ? undefined : persona.intents[pendingIntent];

  // A reply to our question, unless it is clearly a new question for another intent.
  if (pending?.ask && (matched === -1 || matched === pendingIntent)) {
    return { kind: 'answer', text: pending.answer(pending.ask.find(text) ?? text.trim()) };
  }

  if (matched === -1) return { kind: 'answer', text: persona.fallback };

  const intent = persona.intents[matched];
  const detail = intent.ask?.find(text);
  if (intent.ask && !detail) return { kind: 'ask', text: intent.ask.question, intent: matched };

  return { kind: 'answer', text: intent.answer(detail) };
}
