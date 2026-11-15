import { formatQuery, type RQBJsonLogic, type RuleGroupType } from 'react-querybuilder';
import { parseJsonLogic } from 'react-querybuilder/parseJsonLogic';
import { describe, expect, it } from 'vitest';
import { getArrayItemConditionIssue } from '@/components/conditions-editor/array-item-condition';
import { customRuleProcessor, parseJsonLogicOptions } from './conditions';

function roundTrip(logic: RQBJsonLogic) {
  const query = parseJsonLogic(logic, parseJsonLogicOptions);

  return {
    query,
    logic: formatQuery(query as RuleGroupType, { format: 'jsonlogic', ruleProcessor: customRuleProcessor }),
  };
}

describe('array item conditions', () => {
  it('round-trips an existence check over array items', () => {
    const logic: RQBJsonLogic = { some: [{ var: 'steps.digest-step.events' }, { var: 'payload.channels.email' }] };
    const { query, logic: formatted } = roundTrip(logic);

    expect(query.rules[0]).toMatchObject({
      field: 'steps.digest-step.events',
      operator: 'some',
      value: JSON.stringify({ path: 'payload.channels.email', operator: 'exists', value: '' }),
    });
    expect(formatted).toEqual({ and: [logic] });
  });

  const comparisonCases: Array<[operator: string, logic: RQBJsonLogic]> = [
    ['some', { some: [{ var: 'steps.digest-step.events' }, { '==': [{ var: 'payload.status' }, 'foo'] }] }],
    ['all', { all: [{ var: 'steps.digest-step.events' }, { '==': [{ var: 'payload.status' }, 'foo'] }] }],
    ['none', { none: [{ var: 'steps.digest-step.events' }, { '==': [{ var: 'payload.status' }, 'foo'] }] }],
  ];

  it.each(comparisonCases)('round-trips a comparison with the "%s" operator', (operator, logic) => {
    const { query, logic: formatted } = roundTrip(logic);

    expect(query.rules[0]).toMatchObject({
      field: 'steps.digest-step.events',
      operator,
      value: JSON.stringify({ path: 'payload.status', operator: '=', value: 'foo' }),
    });
    expect(formatted).toEqual({ and: [logic] });
  });

  it('keeps array item conditions next to other rules', () => {
    const logic: RQBJsonLogic = {
      and: [
        { '==': [{ var: 'payload.foo' }, 'bar'] },
        { none: [{ var: 'steps.digest-step.events' }, { '>': [{ var: 'payload.count' }, 5] }] },
      ],
    };
    const { logic: formatted } = roundTrip(logic);

    expect(formatted).toEqual({
      and: [
        { '==': [{ var: 'payload.foo' }, 'bar'] },
        { none: [{ var: 'steps.digest-step.events' }, { '>': [{ var: 'payload.count' }, '5'] }] },
      ],
    });
  });

  it('ignores unsupported nested logic', () => {
    const logic: RQBJsonLogic = {
      some: [{ var: 'steps.digest-step.events' }, { and: [{ var: 'payload.a' }, { var: 'payload.b' }] }],
    };

    expect(parseJsonLogic(logic, parseJsonLogicOptions).rules).toHaveLength(0);
  });

  it('requires the item property and the comparison value only when comparing', () => {
    expect(getArrayItemConditionIssue('')).toBe('Item property is required');
    expect(getArrayItemConditionIssue(JSON.stringify({ path: 'payload.a', operator: 'exists', value: '' }))).toBeNull();
    expect(getArrayItemConditionIssue(JSON.stringify({ path: 'payload.a', operator: '=', value: '' }))).toBe(
      'Value is required'
    );
    expect(getArrayItemConditionIssue(JSON.stringify({ path: 'payload.a', operator: '=', value: 'foo' }))).toBeNull();
  });
});
