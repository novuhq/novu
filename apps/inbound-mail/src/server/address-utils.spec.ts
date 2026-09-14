import { expect } from 'chai';

import { extractEmailDomain } from './address-utils';

describe('extractEmailDomain', () => {
  it('returns the domain after the first @', () => {
    expect(extractEmailDomain('user@domain.com')).to.equal('domain.com');
  });

  it('returns everything after the first @ when several @ are present', () => {
    expect(extractEmailDomain('user@sub@domain.com')).to.equal('sub@domain.com');
  });

  it('returns null for an address with no @ instead of throwing', () => {
    /*
     * RFC 5321 allows a domain-less envelope address such as <postmaster>.
     * The previous `/@(.*)/.exec(email)[1]` threw a TypeError on the null match,
     * which surfaced as an unhandled error during address validation.
     */
    expect(extractEmailDomain('postmaster')).to.equal(null);
  });

  it('returns an empty string when the address ends with @', () => {
    expect(extractEmailDomain('user@')).to.equal('');
  });
});
