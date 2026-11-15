import { expect } from 'chai';

import { parseTagsQueryValue } from './parse-tags-query';

describe('parseTagsQueryValue', () => {
  it('coerces array elements to strings', () => {
    expect(parseTagsQueryValue([1, true, 'x'])).to.deep.equal(['1', 'true', 'x']);
  });

  it('coerces nested arrays to explicit { and: [{ or }] }', () => {
    expect(parseTagsQueryValue([[1, 'a'], [true]])).to.deep.equal({
      and: [{ or: ['1', 'a'] }, { or: ['true'] }],
    });
  });

  it('parses indexed object into { and } for multiple groups', () => {
    expect(
      parseTagsQueryValue({
        0: ['a', 'b'],
        1: ['c'],
      })
    ).to.deep.equal({
      and: [{ or: ['a', 'b'] }, { or: ['c'] }],
    });
  });

  it('parses indexed object with one group as flat string[]', () => {
    expect(parseTagsQueryValue({ 0: ['a', 'b'] })).to.deep.equal(['a', 'b']);
  });

  it('parses explicit { or }', () => {
    expect(parseTagsQueryValue({ or: [1, 'x'] })).to.deep.equal({ or: ['1', 'x'] });
  });

  describe('qs arrayLimit overflow (more than 20 items become an index-keyed object)', () => {
    const tagList = (count: number, prefix = 't') => Array.from({ length: count }, (_, i) => `${prefix}${i}`);
    const asIndexedObject = (items: unknown[]) => Object.fromEntries(items.map((item, i) => [String(i), item]));

    it('treats 21 flat tags[] values as a flat OR list, not an AND of single tags', () => {
      expect(parseTagsQueryValue(asIndexedObject(tagList(21)))).to.deep.equal(tagList(21));
    });

    it('treats 31 flat tags[] values as a flat list (no group-count overflow)', () => {
      expect(parseTagsQueryValue(asIndexedObject(tagList(31)))).to.deep.equal(tagList(31));
    });

    it('orders index keys numerically', () => {
      expect(parseTagsQueryValue({ 10: 'c', 2: 'b', 0: 'a' })).to.deep.equal(['a', 'b', 'c']);
    });

    it('normalizes an overflowing OR group nested in AND groups instead of stringifying it', () => {
      expect(parseTagsQueryValue([asIndexedObject(tagList(21)), ['z']])).to.deep.equal({
        and: [{ or: tagList(21) }, { or: ['z'] }],
      });
    });

    it('keeps more than 20 AND groups as AND groups', () => {
      const groups = tagList(22, 'g').map((tag) => [tag]);

      expect(parseTagsQueryValue(asIndexedObject(groups))).to.deep.equal({
        and: groups.map((group) => ({ or: group })),
      });
    });

    it('normalizes overflowing explicit { or } and { and } values', () => {
      expect(parseTagsQueryValue({ or: asIndexedObject(tagList(21)) })).to.deep.equal({ or: tagList(21) });
      expect(parseTagsQueryValue({ and: [{ or: asIndexedObject(tagList(21)) }] })).to.deep.equal({
        and: [{ or: tagList(21) }],
      });
    });
  });
});
