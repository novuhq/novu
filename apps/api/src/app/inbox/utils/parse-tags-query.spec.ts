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
});
