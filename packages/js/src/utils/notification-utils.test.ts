import {
  areTagsEqual,
  checkNotificationDataFilter,
  checkNotificationTagFilter,
  normalizeTagGroups,
} from './notification-utils';

describe('normalizeTagGroups', () => {
  it('wraps flat tags as one OR-group', () => {
    expect(normalizeTagGroups(['a', 'b'])).toEqual([['a', 'b']]);
  });

  it('normalizes explicit { and: [{ or }] }', () => {
    expect(
      normalizeTagGroups({
        and: [{ or: ['a', 'b'] }, { or: ['c'] }],
      })
    ).toEqual([['a', 'b'], ['c']]);
  });

  it('rejects nested string[][]', () => {
    expect(() => normalizeTagGroups([['a', 'b'], ['c']] as never)).toThrow();
  });

  it('rejects non-array values', () => {
    expect(() => normalizeTagGroups('not-an-array' as never)).toThrow();
  });
});

describe('checkNotificationTagFilter', () => {
  it('returns false for non-array filter values', () => {
    expect(checkNotificationTagFilter(['x'], '' as never)).toBe(false);
    expect(checkNotificationTagFilter(['x'], null as never)).toBe(false);
  });

  it('matches OR for flat filter', () => {
    expect(checkNotificationTagFilter(['x', 'y'], ['y'])).toBe(true);
    expect(checkNotificationTagFilter(['x'], ['y'])).toBe(false);
  });

  it('matches AND of OR-groups for explicit filter', () => {
    expect(
      checkNotificationTagFilter(['a', 'c'], {
        and: [{ or: ['a', 'b'] }, { or: ['c', 'd'] }],
      })
    ).toBe(true);

    expect(
      checkNotificationTagFilter(['a'], {
        and: [{ or: ['a', 'b'] }, { or: ['c', 'd'] }],
      })
    ).toBe(false);
  });
});

describe('checkNotificationDataFilter', () => {
  it('matches scalar exact equality', () => {
    expect(checkNotificationDataFilter({ status: 'open' }, { status: 'open' })).toBe(true);
    expect(checkNotificationDataFilter({ status: 'closed' }, { status: 'open' })).toBe(false);
  });

  it('matches OR via flat filter array (notification has scalar)', () => {
    expect(checkNotificationDataFilter({ status: 'draft' }, { status: ['open', 'draft'] })).toBe(true);
    expect(checkNotificationDataFilter({ status: 'closed' }, { status: ['open', 'draft'] })).toBe(false);
  });

  it('matches OR via { or }', () => {
    expect(checkNotificationDataFilter({ status: 'open' }, { status: { or: ['open', 'draft'] } })).toBe(true);
  });

  it('matches AND of OR-groups (CNF)', () => {
    const filter = { project: { and: [{ or: ['a', 'b'] }, { or: ['b', 'c'] }] } };
    expect(checkNotificationDataFilter({ project: 'b' }, filter)).toBe(true);
    expect(checkNotificationDataFilter({ project: 'a' }, filter)).toBe(false);
  });

  it('matches across multiple keys with AND semantics', () => {
    expect(
      checkNotificationDataFilter({ status: 'draft', project: 'abc' }, { status: ['open', 'draft'], project: 'abc' })
    ).toBe(true);

    expect(
      checkNotificationDataFilter({ status: 'closed', project: 'abc' }, { status: ['open', 'draft'], project: 'abc' })
    ).toBe(false);
  });

  it('matches nested paths', () => {
    expect(checkNotificationDataFilter({ project: { id: 'a' } }, { project: { id: ['a', 'b'] } })).toBe(true);
  });

  it('matches when the notification value itself is an array overlapping the filter', () => {
    expect(checkNotificationDataFilter({ tags: ['a', 'b'] }, { tags: ['b', 'c'] })).toBe(true);
    expect(checkNotificationDataFilter({ tags: ['a', 'b'] }, { tags: ['c', 'd'] })).toBe(false);
  });
});

describe('areTagsEqual', () => {
  it('treats equivalent flat and explicit { or } as equal', () => {
    expect(areTagsEqual(['a', 'b'], { or: ['a', 'b'] })).toBe(true);
  });

  it('treats duplicate tags in a group as equivalent', () => {
    expect(areTagsEqual(['a', 'a'], ['a'])).toBe(true);
  });

  it('treats duplicate OR-groups as equivalent', () => {
    expect(
      areTagsEqual(
        {
          and: [{ or: ['a'] }, { or: ['a'] }],
        },
        { and: [{ or: ['a'] }] }
      )
    ).toBe(true);
  });

  it('compares order-independently within groups', () => {
    expect(
      areTagsEqual(
        {
          and: [{ or: ['b', 'a'] }, { or: ['c'] }],
        },
        {
          and: [{ or: ['a', 'b'] }, { or: ['c'] }],
        }
      )
    ).toBe(true);
  });
});
