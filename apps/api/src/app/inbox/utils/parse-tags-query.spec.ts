import { expect } from 'chai';

import { parseTagsQueryValue } from './parse-tags-query';

describe('parseTagsQueryValue', () => {
  it('coerces array elements to strings', () => {
    expect(parseTagsQueryValue([1, true, 'x'])).to.deep.equal(['1', 'true', 'x']);
  });

  it('coerces nested array elements to strings', () => {
    expect(parseTagsQueryValue([[1, 'a'], [true]])).to.deep.equal([['1', 'a'], ['true']]);
  });
});
