import { BadRequestException } from '@nestjs/common';
import { encodeOAuthState } from '@novu/application-generic';
import { ChatProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  decodeLegacyChatOauthState,
  encodeLegacyChatOauthState,
  type LegacyChatOauthStateData,
  peekLegacyChatOauthStateEnvironmentId,
} from './legacy-chat-oauth-state';

const VICTIM_API_KEY = 'victim-environment-api-key';
const ATTACKER_API_KEY = 'attacker-environment-api-key';

function buildState(overrides: Partial<LegacyChatOauthStateData> = {}): LegacyChatOauthStateData {
  return {
    environmentId: '6a6600c7762b9e152a1f6728',
    subscriberId: 'victim-subscriber',
    providerId: ChatProviderIdEnum.Slack,
    integrationIdentifier: 'victim-slack',
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('legacy chat OAuth state', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('round-trips the signed payload', () => {
    const data = buildState({ hmacHash: 'deadbeef' });

    const decoded = decodeLegacyChatOauthState(encodeLegacyChatOauthState(data, VICTIM_API_KEY), VICTIM_API_KEY);

    expect(decoded).to.deep.equal(data);
  });

  it('exposes the environment id before the signature is verified', () => {
    const data = buildState();

    expect(peekLegacyChatOauthStateEnvironmentId(encodeLegacyChatOauthState(data, VICTIM_API_KEY))).to.equal(
      data.environmentId
    );
  });

  it('rejects a state signed with another environment key', () => {
    const state = encodeLegacyChatOauthState(buildState(), ATTACKER_API_KEY);

    expect(() => decodeLegacyChatOauthState(state, VICTIM_API_KEY)).to.throw(BadRequestException);
  });

  it('rejects a payload edited after signing', () => {
    const data = buildState();
    const signed = encodeLegacyChatOauthState(data, VICTIM_API_KEY);
    const { signature } = splitForTest(signed);
    const tampered = encodeOAuthState(JSON.stringify({ ...data, subscriberId: 'other-subscriber' }), signature);

    expect(() => decodeLegacyChatOauthState(tampered, VICTIM_API_KEY)).to.throw(BadRequestException);
  });

  it('rejects an unsigned payload', () => {
    const unsigned = Buffer.from(JSON.stringify(buildState())).toString('base64url');

    expect(() => decodeLegacyChatOauthState(unsigned, VICTIM_API_KEY)).to.throw(BadRequestException);
  });

  it('rejects a state older than the TTL', () => {
    const state = encodeLegacyChatOauthState(buildState({ timestamp: Date.now() - 16 * 60 * 1000 }), VICTIM_API_KEY);

    expect(() => decodeLegacyChatOauthState(state, VICTIM_API_KEY)).to.throw(BadRequestException, 'expired');
  });
});

function splitForTest(state: string): { payload: string; signature: string } {
  const decoded = Buffer.from(state, 'base64url').toString();
  const lastDotIndex = decoded.lastIndexOf('.');

  return { payload: decoded.slice(0, lastDotIndex), signature: decoded.slice(lastDotIndex + 1) };
}
