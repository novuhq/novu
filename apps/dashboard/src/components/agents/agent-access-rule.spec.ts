import type { RuleGroupType } from 'react-querybuilder';
import { describe, expect, it } from 'vitest';
import { ACCESS_RULE_SUBSCRIBER_VARIABLES, parseAccessRule, toAccessRule } from '@/components/agents/agent-access-rule';
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
});

const email = { var: 'subscriber.email' };
const seats = { var: 'context.tenant.data.seats' };
const subscriberVariablesOnly = ACCESS_RULE_SUBSCRIBER_VARIABLES;

describe('opening a rule written through the API', () => {
  it.each([
    {
      name: 'notIn block list',
      stored: { notIn: [email, ['a@x.com']] },
    },
    {
      name: 'block list that mixes !in and notIn',
      stored: { and: [{ '!': { in: [email, ['bad@x.com']] } }, { notIn: [email, ['b@x.com']] }] },
    },
  ])('reports $name as not editable', ({ stored }) => {
    expect(parseAccessRule(stored)).toBeNull();
  });

  it.each([
    {
      name: 'typed context number whose field is not in the loaded variables',
      stored: { '==': [seats, 5] },
      saved: { and: [{ '==': [seats, 5] }] },
    },
    {
      name: 'block list with a typed context number and a subscriber.data boolean',
      stored: {
        and: [
          { '!': { in: [email, ['bad@x.com']] } },
          { '==': [seats, 5] },
          { '==': [{ var: 'subscriber.data.vip' }, true] },
        ],
      },
    },
    {
      name: 'subscriber.data text that reads like a boolean',
      stored: { and: [{ '==': [{ var: 'subscriber.data.code' }, 'true'] }] },
    },
  ])('saves $name unchanged', ({ stored, saved = stored }) => {
    const opened = parseAccessRule(stored);

    expect(opened).not.toBeNull();
    expect(toAccessRule(opened as RuleGroupType, subscriberVariablesOnly)).toEqual(saved);
  });
});
