import type { DomainRouteMatch } from '@novu/shared';
import type { IconType } from 'react-icons';
import {
  RiCheckboxCircleLine,
  RiForbid2Line,
  RiMailForbidLine,
  RiReplyLine,
  RiSearchLine,
  RiShieldCheckLine,
  RiSpamLine,
  RiUserForbidLine,
} from 'react-icons/ri';

export type PresetCategory = 'allow' | 'block' | 'quality';

export type PresetInputType = 'email-list' | 'domain-list' | 'keyword-list';

export type PresetInputDef = {
  id: string;
  label: string;
  placeholder: string;
  type: PresetInputType;
  defaultValue?: string[];
};

export type PresetInputValues = Record<string, string[]>;

export type RouteMatchPreset = {
  id: string;
  label: string;
  description: string;
  category: PresetCategory;
  icon: IconType;
  inputs: PresetInputDef[];
  build: (values: PresetInputValues) => DomainRouteMatch;
  matches: (rule: DomainRouteMatch) => PresetInputValues | null;
};

export const ROUTE_MATCH_CATEGORIES: Array<{ id: PresetCategory; label: string }> = [
  { id: 'allow', label: 'Allow lists' },
  { id: 'block', label: 'Block lists' },
  { id: 'quality', label: 'Quality & routing' },
];

const FREE_MAIL_PROVIDERS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'aol.com',
  'icloud.com',
  'proton.me',
  'gmx.com',
  'mail.ru',
  'live.com',
  'msn.com',
];

function normalizeList(values: string[] = []): string[] {
  return Array.from(new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean)));
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value);
}

function listRule(path: string, values: string[]): DomainRouteMatch {
  return { in: [{ var: path }, normalizeList(values)] };
}

function negatedListRule(path: string, values: string[]): DomainRouteMatch {
  return { '!': listRule(path, values) };
}

function matchListRule(rule: DomainRouteMatch, path: string): string[] | null {
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) return null;

  const inRule = (rule as { in?: unknown }).in;
  if (!Array.isArray(inRule) || inRule.length !== 2) return null;

  const [variable, values] = inRule;
  if (!variable || typeof variable !== 'object' || (variable as { var?: unknown }).var !== path) return null;
  if (!Array.isArray(values) || !values.every((value) => typeof value === 'string')) return null;

  return values;
}

function matchNegatedListRule(rule: DomainRouteMatch, path: string): string[] | null {
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) return null;

  const negated = (rule as { '!': DomainRouteMatch })['!'];

  return matchListRule(negated, path);
}

function exactRuleMatcher(expected: DomainRouteMatch) {
  return (rule: DomainRouteMatch): PresetInputValues | null => {
    if (stableStringify(rule) !== stableStringify(expected)) return null;

    return {};
  };
}

const rejectUnsignedMailRule: DomainRouteMatch = {
  and: [{ '==': [{ var: 'auth.spf' }, 'pass'] }, { '==': [{ var: 'auth.dkim' }, 'pass'] }],
};

const dropAutoRespondersRule: DomainRouteMatch = {
  '!': {
    or: [
      {
        and: [
          { '!=': [{ var: 'mail.headers.auto-submitted' }, null] },
          { '!=': [{ var: 'mail.headers.auto-submitted' }, 'no'] },
        ],
      },
      { startsWith: [{ var: 'mail.subject' }, 'Auto-reply:'] },
      { startsWith: [{ var: 'mail.subject' }, 'Out of office'] },
    ],
  },
};

const repliesOnlyRule: DomainRouteMatch = { '!=': [{ var: 'mail.inReplyTo' }, null] };

export const ROUTE_MATCH_PRESETS: RouteMatchPreset[] = [
  {
    id: 'allow-senders',
    label: 'Allow listed senders',
    description: 'Deliver only when the sender email address is in the list.',
    category: 'allow',
    icon: RiCheckboxCircleLine,
    inputs: [{ id: 'senders', label: 'Sender emails', placeholder: 'jane@acme.com', type: 'email-list' }],
    build: (values) => listRule('mail.fromAddress', values.senders),
    matches: (rule) => {
      const senders = matchListRule(rule, 'mail.fromAddress');
      if (!senders) return null;

      return { senders };
    },
  },
  {
    id: 'allow-domains',
    label: 'Allow sender domains',
    description: 'Deliver only when the sender domain is in the list.',
    category: 'allow',
    icon: RiCheckboxCircleLine,
    inputs: [{ id: 'domains', label: 'Sender domains', placeholder: 'acme.com', type: 'domain-list' }],
    build: (values) => listRule('mail.fromDomain', values.domains),
    matches: (rule) => {
      const domains = matchListRule(rule, 'mail.fromDomain');
      if (!domains) return null;

      return { domains };
    },
  },
  {
    id: 'block-senders',
    label: 'Block listed senders',
    description: 'Deliver unless the sender email address is in the list.',
    category: 'block',
    icon: RiUserForbidLine,
    inputs: [
      {
        id: 'senders',
        label: 'Sender emails',
        placeholder: 'spam@example.com',
        type: 'email-list',
      },
    ],
    build: (values) => negatedListRule('mail.fromAddress', values.senders),
    matches: (rule) => {
      const senders = matchNegatedListRule(rule, 'mail.fromAddress');
      if (!senders) return null;

      return { senders };
    },
  },
  {
    id: 'block-domains',
    label: 'Block sender domains',
    description: 'Deliver unless the sender domain is in the list.',
    category: 'block',
    icon: RiForbid2Line,
    inputs: [{ id: 'domains', label: 'Sender domains', placeholder: 'spam.io', type: 'domain-list' }],
    build: (values) => negatedListRule('mail.fromDomain', values.domains),
    matches: (rule) => {
      const domains = matchNegatedListRule(rule, 'mail.fromDomain');
      if (!domains) return null;

      return { domains };
    },
  },
  {
    id: 'block-free-mail',
    label: 'Block free-mail providers',
    description: 'Reject mail from common consumer mailbox providers.',
    category: 'block',
    icon: RiMailForbidLine,
    inputs: [
      {
        id: 'domains',
        label: 'Blocked domains',
        placeholder: 'gmail.com',
        type: 'domain-list',
        defaultValue: FREE_MAIL_PROVIDERS,
      },
    ],
    build: (values) => negatedListRule('mail.fromDomain', values.domains),
    matches: () => null,
  },
  {
    id: 'reject-unsigned-mail',
    label: 'Reject unsigned mail',
    description: 'Deliver only when SPF and DKIM both pass.',
    category: 'quality',
    icon: RiShieldCheckLine,
    inputs: [],
    build: () => rejectUnsignedMailRule,
    matches: exactRuleMatcher(rejectUnsignedMailRule),
  },
  {
    id: 'drop-auto-responders',
    label: 'Drop auto-responders',
    description: 'Skip common out-of-office and auto-reply messages.',
    category: 'quality',
    icon: RiSpamLine,
    inputs: [],
    build: () => dropAutoRespondersRule,
    matches: exactRuleMatcher(dropAutoRespondersRule),
  },
  {
    id: 'replies-only',
    label: 'Replies only',
    description: 'Deliver only messages that are replies to an existing thread.',
    category: 'quality',
    icon: RiReplyLine,
    inputs: [],
    build: () => repliesOnlyRule,
    matches: exactRuleMatcher(repliesOnlyRule),
  },
  {
    id: 'subject-keywords',
    label: 'Subject contains keyword',
    description: 'Deliver only when the subject includes one of these keywords.',
    category: 'quality',
    icon: RiSearchLine,
    inputs: [{ id: 'keywords', label: 'Keywords', placeholder: 'urgent', type: 'keyword-list' }],
    build: (values) => ({
      or: normalizeList(values.keywords).map((keyword) => ({ contains: [{ var: 'mail.subject' }, keyword] })),
    }),
    matches: () => null,
  },
];

export function findMatchingRoutePreset(match?: DomainRouteMatch | null) {
  if (!match) return null;

  for (const preset of ROUTE_MATCH_PRESETS) {
    const values = preset.matches(match);
    if (values) {
      return { preset, values };
    }
  }

  return null;
}

export function getDefaultPresetValues(preset: RouteMatchPreset): PresetInputValues {
  return Object.fromEntries(preset.inputs.map((input) => [input.id, input.defaultValue ?? []]));
}

export function parsePresetInput(value: string): string[] {
  return normalizeList(value.split(','));
}
