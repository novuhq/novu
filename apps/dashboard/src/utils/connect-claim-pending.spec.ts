import { describe, expect, it } from 'vitest';
import { readConnectClaimTokenFromRedirectUrl } from './connect-claim-pending';

const TOKEN = 'T'.repeat(32);

describe('readConnectClaimTokenFromRedirectUrl', () => {
  it('reads the token of a connect-claim return URL', () => {
    expect(readConnectClaimTokenFromRedirectUrl(`/connect/claim?token=${TOKEN}`)).toBe(TOKEN);
    expect(readConnectClaimTokenFromRedirectUrl(`https://dashboard.novu.co/connect/claim?token=${TOKEN}`)).toBe(TOKEN);
  });

  it('ignores other return URLs and malformed tokens', () => {
    expect(readConnectClaimTokenFromRedirectUrl(`/workflows?token=${TOKEN}`)).toBeNull();
    expect(readConnectClaimTokenFromRedirectUrl('/connect/claim?token=short')).toBeNull();
    expect(readConnectClaimTokenFromRedirectUrl(null)).toBeNull();
  });
});
