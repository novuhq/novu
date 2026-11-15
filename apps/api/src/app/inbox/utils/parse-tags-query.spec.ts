import { buildTagsQuery, normalizeTagGroups, TagsFilterValidationError } from '@novu/shared';
import { expect } from 'chai';
import express from 'express';

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
    it('keeps a single overflowing group as a flat list', () => {
      expect(parseTagsQueryValue({ 0: asIndexedObject(tagList(21)) })).to.deep.equal(tagList(21));
    });
  });

  it('reads named keys with scalar values as one AND group per key', () => {
    expect(parseTagsQueryValue({ foo: 'a', bar: 'b' })).to.deep.equal({ and: [{ or: ['a'] }, { or: ['b'] }] });
  });

  it('reads sparse index keys as the flat list qs builds below the array limit', () => {
    expect(parseTagsQueryValue({ 0: 'a', 30: 'b' })).to.deep.equal(['a', 'b']);
  });

  it('reads a keyed object without "or" / "and" as a list of groups', () => {
    expect(parseTagsQueryValue({ foo: 'a', bar: ['b'] })).to.deep.equal({ and: [{ or: ['a'] }, { or: ['b'] }] });
  });

  it('rejects an { and } entry that is neither { or } nor an array', () => {
    expect(() => parseTagsQueryValue({ and: ['a'] })).to.throw(TagsFilterValidationError);
  });

  it('rejects a filter with both "or" and "and"', () => {
    expect(() => parseTagsQueryValue({ or: ['a'], and: [['b']] })).to.throw(TagsFilterValidationError);
  });
});

describe('parseTagsQueryValue with the API query parser', () => {
  // Same parser as apps/api/src/bootstrap.ts (`app.set('query parser', 'extended')`).
  const app = express();
  app.set('query parser', 'extended');
  const parseQueryString: (queryString: string) => Record<string, unknown> = app.get('query parser fn');

  const tags = Array.from({ length: 31 }, (_, i) => `t${i}`);
  const flatQuery = (count: number) =>
    tags
      .slice(0, count)
      .map((tag) => `tags[]=${tag}`)
      .join('&');
  const groupQuery = (index: number, groupTags: string[]) =>
    groupTags.map((tag) => `tags[${index}][]=${tag}`).join('&');
  const tagsMongoQuery = (queryString: string) =>
    buildTagsQuery(normalizeTagGroups(parseTagsQueryValue(parseQueryString(queryString).tags)));

  it('matches any of 20 flat tags (below the qs array limit)', () => {
    expect(tagsMongoQuery(flatQuery(20))).to.deep.equal({ tags: { $in: tags.slice(0, 20) } });
  });

  it('matches any of 21 flat tags', () => {
    expect(tagsMongoQuery(flatQuery(21))).to.deep.equal({ tags: { $in: tags.slice(0, 21) } });
  });

  it('matches any of 31 flat tags', () => {
    expect(tagsMongoQuery(flatQuery(31))).to.deep.equal({ tags: { $in: tags } });
  });

  it('matches an overflowing OR group together with a second group', () => {
    expect(tagsMongoQuery(`${groupQuery(0, tags.slice(0, 21))}&${groupQuery(1, ['z'])}`)).to.deep.equal({
      $and: [{ tags: { $in: tags.slice(0, 21) } }, { tags: { $in: ['z'] } }],
    });
  });

  it('keeps named keys as AND groups', () => {
    expect(tagsMongoQuery('tags[foo]=t0&tags[bar]=z')).to.deep.equal({
      $and: [{ tags: { $in: ['t0'] } }, { tags: { $in: ['z'] } }],
    });
  });

  it('keeps 22 AND groups as AND groups', () => {
    const query = tags
      .slice(0, 22)
      .map((tag, i) => groupQuery(i, [tag]))
      .join('&');

    expect(tagsMongoQuery(query)).to.deep.equal({
      $and: tags.slice(0, 22).map((tag) => ({ tags: { $in: [tag] } })),
    });
  });
});
