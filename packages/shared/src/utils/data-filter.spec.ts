import { describe, expect, it } from 'vitest';

import {
  buildDataFilterQuery,
  checkDataFilterMatches,
  DataFilterValidationError,
  normalizeDataFilter,
} from './data-filter';

describe('normalizeDataFilter', () => {
  it('returns empty for undefined / null / empty object', () => {
    expect(normalizeDataFilter(undefined)).toEqual([]);
    expect(normalizeDataFilter(null)).toEqual([]);
    expect(normalizeDataFilter({})).toEqual([]);
  });

  it('normalizes scalar values to a single-element OR-group', () => {
    expect(normalizeDataFilter({ status: 'open' })).toEqual([{ path: 'status', groups: [['open']] }]);
    expect(normalizeDataFilter({ count: 4 })).toEqual([{ path: 'count', groups: [[4]] }]);
    expect(normalizeDataFilter({ active: true })).toEqual([{ path: 'active', groups: [[true]] }]);
    expect(normalizeDataFilter({ ref: null })).toEqual([{ path: 'ref', groups: [[null]] }]);
  });

  it('normalizes flat arrays as a single OR-group', () => {
    expect(normalizeDataFilter({ status: ['open', 'draft'] })).toEqual([
      { path: 'status', groups: [['open', 'draft']] },
    ]);
  });

  it('normalizes explicit { or }', () => {
    expect(normalizeDataFilter({ status: { or: ['open', 'draft'] } })).toEqual([
      { path: 'status', groups: [['open', 'draft']] },
    ]);
  });

  it('drops paths whose { or } is empty', () => {
    expect(normalizeDataFilter({ status: { or: [] } })).toEqual([]);
  });

  it('normalizes explicit { and: [{ or }, ...] }', () => {
    expect(
      normalizeDataFilter({
        priority: {
          and: [{ or: ['high', 'medium'] }, { or: ['urgent'] }],
        },
      })
    ).toEqual([{ path: 'priority', groups: [['high', 'medium'], ['urgent']] }]);
  });

  it('walks one level of nested objects', () => {
    expect(
      normalizeDataFilter({
        project: {
          id: ['a', 'b'],
          status: 'open',
        },
      })
    ).toEqual([
      { path: 'project.id', groups: [['a', 'b']] },
      { path: 'project.status', groups: [['open']] },
    ]);
  });

  it('rejects nested arrays of arrays', () => {
    expect(() => normalizeDataFilter({ status: [['a', 'b'], ['c']] as never })).toThrow(DataFilterValidationError);
  });

  it('rejects both or and and on the same object', () => {
    expect(() => normalizeDataFilter({ status: { or: ['a'], and: [{ or: ['b'] }] } as never })).toThrow(
      DataFilterValidationError
    );
  });

  it('rejects non-scalar values inside an OR-group', () => {
    expect(() => normalizeDataFilter({ status: [{ nested: 1 }] as never })).toThrow(DataFilterValidationError);
  });

  it('rejects more than 2 levels of nesting', () => {
    expect(() => normalizeDataFilter({ project: { meta: { id: 'x' } } } as never)).toThrow(DataFilterValidationError);
  });

  it('rejects keys starting with $ or .', () => {
    expect(() => normalizeDataFilter({ $where: 'x' } as never)).toThrow(DataFilterValidationError);
    expect(() => normalizeDataFilter({ '.foo': 'x' } as never)).toThrow(DataFilterValidationError);
  });

  it('rejects dangerous prototype keys', () => {
    const malicious: Record<string, unknown> = {};
    Object.defineProperty(malicious, '__proto__', {
      value: null,
      enumerable: true,
      configurable: true,
      writable: true,
    });
    expect(() => normalizeDataFilter(malicious)).toThrow(DataFilterValidationError);
    expect(() => normalizeDataFilter({ constructor: 'x' } as never)).toThrow(DataFilterValidationError);
    expect(() => normalizeDataFilter({ prototype: 'x' } as never)).toThrow(DataFilterValidationError);
  });

  it('rejects strings longer than the limit', () => {
    const long = 'a'.repeat(257);
    expect(() => normalizeDataFilter({ status: long })).toThrow(DataFilterValidationError);
  });

  it('rejects non-finite numbers', () => {
    expect(() => normalizeDataFilter({ count: Number.NaN })).toThrow(DataFilterValidationError);
    expect(() => normalizeDataFilter({ count: Infinity })).toThrow(DataFilterValidationError);
  });
});

describe('buildDataFilterQuery', () => {
  it('returns empty object for empty input', () => {
    expect(buildDataFilterQuery(undefined)).toEqual({});
    expect(buildDataFilterQuery({})).toEqual({});
  });

  it('builds exact-equality clauses for scalar values', () => {
    expect(buildDataFilterQuery({ status: 'open' })).toEqual({
      $and: [{ 'data.status': 'open' }],
    });
  });

  it('uses $in for OR-groups', () => {
    expect(buildDataFilterQuery({ status: ['open', 'draft'] })).toEqual({
      $and: [{ 'data.status': { $in: ['open', 'draft'] } }],
    });
  });

  it('emits one clause per OR-group when AND-of-OR is supplied', () => {
    expect(
      buildDataFilterQuery({
        priority: { and: [{ or: ['high', 'medium'] }, { or: ['urgent'] }] },
      })
    ).toEqual({
      $and: [{ 'data.priority': { $in: ['high', 'medium'] } }, { 'data.priority': 'urgent' }],
    });
  });

  it('combines multiple keys with AND', () => {
    expect(
      buildDataFilterQuery({
        status: ['open', 'draft'],
        project: 'abc',
      })
    ).toEqual({
      $and: [{ 'data.status': { $in: ['open', 'draft'] } }, { 'data.project': 'abc' }],
    });
  });

  it('supports nested keys with dotted paths', () => {
    expect(
      buildDataFilterQuery({
        project: { id: ['a', 'b'], status: 'open' },
      })
    ).toEqual({
      $and: [{ 'data.project.id': { $in: ['a', 'b'] } }, { 'data.project.status': 'open' }],
    });
  });
});

describe('checkDataFilterMatches', () => {
  it('matches when filter is empty', () => {
    expect(checkDataFilterMatches({ status: 'open' }, undefined)).toBe(true);
    expect(checkDataFilterMatches(null, undefined)).toBe(true);
    expect(checkDataFilterMatches(null, {})).toBe(true);
  });

  it('rejects when filter is set but data is empty', () => {
    expect(checkDataFilterMatches(null, { status: 'open' })).toBe(false);
    expect(checkDataFilterMatches(undefined, { status: 'open' })).toBe(false);
  });

  it('matches scalar equality', () => {
    expect(checkDataFilterMatches({ status: 'open' }, { status: 'open' })).toBe(true);
    expect(checkDataFilterMatches({ status: 'closed' }, { status: 'open' })).toBe(false);
  });

  it('matches OR-group via flat array', () => {
    expect(checkDataFilterMatches({ status: 'draft' }, { status: ['open', 'draft'] })).toBe(true);
    expect(checkDataFilterMatches({ status: 'closed' }, { status: ['open', 'draft'] })).toBe(false);
  });

  it('matches { or }', () => {
    expect(checkDataFilterMatches({ status: 'open' }, { status: { or: ['open', 'draft'] } })).toBe(true);
  });

  it('matches AND of OR-groups (CNF) — only when both groups match', () => {
    const filter = { project: { and: [{ or: ['a', 'b'] }, { or: ['b', 'c'] }] } };
    expect(checkDataFilterMatches({ project: 'b' }, filter)).toBe(true);
    expect(checkDataFilterMatches({ project: 'a' }, filter)).toBe(false);
    expect(checkDataFilterMatches({ project: 'c' }, filter)).toBe(false);
  });

  it('matches across multiple keys with AND semantics', () => {
    expect(
      checkDataFilterMatches({ status: 'draft', project: 'abc' }, { status: ['open', 'draft'], project: 'abc' })
    ).toBe(true);

    expect(
      checkDataFilterMatches({ status: 'closed', project: 'abc' }, { status: ['open', 'draft'], project: 'abc' })
    ).toBe(false);
  });

  it('matches nested paths', () => {
    expect(checkDataFilterMatches({ project: { id: 'a', status: 'open' } }, { project: { id: ['a', 'b'] } })).toBe(
      true
    );

    expect(checkDataFilterMatches({ project: { id: 'c' } }, { project: { id: ['a', 'b'] } })).toBe(false);
  });

  it('matches when notification value is itself an array containing one of the filter values', () => {
    expect(checkDataFilterMatches({ tags: ['a', 'b'] }, { tags: ['b', 'c'] })).toBe(true);
    expect(checkDataFilterMatches({ tags: ['a', 'b'] }, { tags: ['c', 'd'] })).toBe(false);
  });

  it('returns false on invalid filter shapes', () => {
    expect(checkDataFilterMatches({ status: 'open' }, { status: { or: 'not-an-array' } } as never)).toBe(false);
  });
});
