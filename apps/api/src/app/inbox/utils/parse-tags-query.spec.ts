import { TagsFilterValidationError } from '@novu/shared';
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

  it('parses an indexed object of tags (qs array limit overflow) as a flat tag list', () => {
    const tags = Array.from({ length: 21 }, (_, i) => `t${i}`);
    const overflowed = Object.fromEntries(tags.map((tag, i) => [i, tag]));

    expect(parseTagsQueryValue(overflowed)).to.deep.equal(tags);
  });

  it('parses an overflowed OR-group inside nested groups', () => {
    const tags = Array.from({ length: 21 }, (_, i) => `t${i}`);
    const overflowedGroup = Object.fromEntries(tags.map((tag, i) => [i, tag]));

    expect(parseTagsQueryValue([overflowedGroup, ['z']])).to.deep.equal({
      and: [{ or: tags }, { or: ['z'] }],
    });
  });

  it('parses an overflowed OR-group inside an indexed object of groups', () => {
    const tags = Array.from({ length: 21 }, (_, i) => `t${i}`);
    const overflowedGroup = Object.fromEntries(tags.map((tag, i) => [i, tag]));

    expect(parseTagsQueryValue({ 0: overflowedGroup, 1: ['z'] })).to.deep.equal({
      and: [{ or: tags }, { or: ['z'] }],
    });
  });

  it('parses explicit { and } with { or } and array entries', () => {
    expect(parseTagsQueryValue({ and: [{ or: [1, 'a'] }, ['b']] })).to.deep.equal({
      and: [{ or: ['1', 'a'] }, { or: ['b'] }],
    });
  });

  it('rejects an { and } entry that is neither { or } nor an array', () => {
    expect(() => parseTagsQueryValue({ and: ['a'] })).to.throw(TagsFilterValidationError);
  });

  it('rejects a filter with both "or" and "and"', () => {
    expect(() => parseTagsQueryValue({ or: ['a'], and: [['b']] })).to.throw(TagsFilterValidationError);
  });

  it('parses explicit { or }', () => {
    expect(parseTagsQueryValue({ or: [1, 'x'] })).to.deep.equal({ or: ['1', 'x'] });
  });
});
