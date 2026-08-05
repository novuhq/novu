import { expect } from 'chai';

import { sanitizeUrlForLogging } from './sanitize-url-for-logging';

describe('sanitizeUrlForLogging', () => {
  it('returns origin and pathname without query params', () => {
    expect(sanitizeUrlForLogging('https://mcp.example.com/slack?token=super-secret')).to.equal(
      'https://mcp.example.com/slack'
    );
  });

  it('strips userinfo from parseable URLs via origin', () => {
    expect(sanitizeUrlForLogging('https://user:password@mcp.example.com/slack')).to.equal(
      'https://mcp.example.com/slack'
    );
  });

  it('strips hash fragments', () => {
    expect(sanitizeUrlForLogging('https://mcp.example.com/slack#access-token')).to.equal(
      'https://mcp.example.com/slack'
    );
  });

  it('redacts userinfo from unparseable URLs', () => {
    expect(sanitizeUrlForLogging('/mcp/slack?token=secret')).to.equal('/mcp/slack');
    expect(sanitizeUrlForLogging('//user:pass@host/path?token=secret')).to.equal('//[REDACTED]@host/path');
  });

  it('returns empty string for blank input', () => {
    expect(sanitizeUrlForLogging('   ')).to.equal('');
  });
});
