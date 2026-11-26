import type { RuleGroupType } from 'react-querybuilder';
import { describe, expect, it } from 'vitest';
import {
  ACCESS_RULE_SUBSCRIBER_VARIABLES,
  getAccessRuleFieldIssue,
  getAccessRuleOperatorIssue,
  parseAccessRule,
  toAccessRule,
} from '@/components/agents/agent-access-rule';
import type { EnhancedConditionVariable } from '@/components/conditions-editor/types';

const variables: EnhancedConditionVariable[] = [
  ...ACCESS_RULE_SUBSCRIBER_VARIABLES,
  { name: 'context.tenant.id', dataType: 'string' },
  { name: 'context.tenant.data.seats', dataType: 'number' },
  { name: 'context.tenant.data.beta', dataType: 'boolean' },
];

function query(...rules: Array<{ field: string; operator: string; value: string }>): RuleGroupType {
  return { combinator: 'and', rules };
}

describe('toAccessRule', () => {
  it.each([
    {
      name: 'block-list example from the guidance',
      query: query({ field: 'subscriber.email', operator: 'notIn', value: 'a@x.com, b@y.com' }),
      rule: { and: [{ '!': { in: [{ var: 'subscriber.email' }, ['a@x.com', 'b@y.com']] } }] },
    },
    {
      name: 'boolean subscriber.data value is a boolean, since the API compares == strictly',
      query: query({ field: 'subscriber.data.vip', operator: '=', value: 'true' }),
      rule: { and: [{ '==': [{ var: 'subscriber.data.vip' }, true] }] },
    },
    {
      name: 'other subscriber.data values stay text',
      query: query({ field: 'subscriber.data.plan', operator: '=', value: '5' }),
      rule: { and: [{ '==': [{ var: 'subscriber.data.plan' }, '5'] }] },
    },
    {
      name: 'typed context data is sent as its type',
      query: query(
        { field: 'context.tenant.data.seats', operator: '=', value: '5' },
        { field: 'context.tenant.data.beta', operator: '!=', value: 'false' }
      ),
      rule: {
        and: [
          { '==': [{ var: 'context.tenant.data.seats' }, 5] },
          { '!=': [{ var: 'context.tenant.data.beta' }, false] },
        ],
      },
    },
    {
      name: 'string fields keep numeric-looking text',
      query: query({ field: 'context.tenant.id', operator: '=', value: '42' }),
      rule: { and: [{ '==': [{ var: 'context.tenant.id' }, '42'] }] },
    },
  ])('$name', ({ query, rule }) => {
    expect(toAccessRule(query, variables)).toEqual(rule);
  });

  it('returns null for a rule without conditions, which the API rejects', () => {
    expect(toAccessRule(query(), variables)).toBeNull();
    expect(toAccessRule({ combinator: 'and', rules: [{ combinator: 'or', rules: [] }] }, variables)).toBeNull();
  });

  it('saves a stored rule unchanged after it is opened in the editor', () => {
    const saved = {
      and: [
        { '!': { in: [{ var: 'subscriber.email' }, ['a@x.com', 'b@y.com']] } },
        { '==': [{ var: 'subscriber.data.vip' }, true] },
        { '==': [{ var: 'context.tenant.data.seats' }, 5] },
      ],
    };

    expect(toAccessRule(parseAccessRule(saved), variables)).toEqual(saved);
  });

  it('opens stored typed values as text, which the editor form requires', () => {
    const opened = parseAccessRule({ and: [{ '==': [{ var: 'context.tenant.data.seats' }, 5] }] });

    expect(opened.rules).toEqual([expect.objectContaining({ field: 'context.tenant.data.seats', value: '5' })]);
  });
});

describe('getAccessRuleFieldIssue', () => {
  it.each([
    'subscriber.email',
    'subscriber.timezone',
    'subscriber.data',
    'subscriber.data.plan.tier',
    'context.tenant.id',
    'context.tenant.data',
    'context.tenant.data.plan',
  ])('allows %s', (field) => {
    expect(getAccessRuleFieldIssue(field)).toBeNull();
  });

  it.each([
    'subscriber',
    'subscriber.channels',
    'subscriber.email.domain',
    'subscriber.constructor',
    'context.tenant',
    'context.tenant.name',
    'context.tenant.id.x',
    'payload.region',
    'workflow.name',
  ])('rejects %s', (field) => {
    expect(getAccessRuleFieldIssue(field)).toEqual(expect.any(String));
  });
});

describe('getAccessRuleOperatorIssue', () => {
  it('rejects editor operators that the API does not evaluate in access rules', () => {
    expect(getAccessRuleOperatorIssue('withinLast')).toEqual(expect.any(String));
    expect(getAccessRuleOperatorIssue('some')).toEqual(expect.any(String));
    expect(getAccessRuleOperatorIssue('notIn')).toBeNull();
    expect(getAccessRuleOperatorIssue('between')).toBeNull();
  });
});
