import { IntegrationEntity } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import { AuthDto } from '../dtos/shared.dto';
import { canCallerManageChannelConnection, validateAndNormalizeConnectionAuth } from './channel-connection.utils';

function buildIntegration(overrides: Partial<IntegrationEntity> = {}): IntegrationEntity {
  return {
    identifier: 'slack-integration',
    providerId: ChatProviderIdEnum.Slack,
    credentials: { clientId: 'client-id', secretKey: 'secret-key' },
    ...overrides,
  } as IntegrationEntity;
}

describe('validateAndNormalizeConnectionAuth', () => {
  it('returns auth unchanged when there is no refreshToken', () => {
    const auth: AuthDto = { accessToken: 'xoxb-legacy' };

    const result = validateAndNormalizeConnectionAuth(auth, buildIntegration());

    expect(result).to.equal(auth);
  });

  it('defaults expiresAt to ~now when a refreshToken is provided without one', () => {
    const before = Date.now();
    const auth: AuthDto = { accessToken: 'xoxe.xoxb-token', refreshToken: 'xoxe-1-refresh' };

    const result = validateAndNormalizeConnectionAuth(auth, buildIntegration());

    expect(result.expiresAt, 'expiresAt should be defaulted').to.be.a('string');
    const expiresAtTime = new Date(result.expiresAt as string).getTime();
    expect(expiresAtTime).to.be.gte(before);
    expect(expiresAtTime).to.be.lte(Date.now());
  });

  it('keeps the provided expiresAt untouched', () => {
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
    const auth: AuthDto = { accessToken: 'xoxe.xoxb-token', refreshToken: 'xoxe-1-refresh', expiresAt };

    const result = validateAndNormalizeConnectionAuth(auth, buildIntegration());

    expect(result.expiresAt).to.equal(expiresAt);
  });

  it('throws when the provider does not support token rotation', () => {
    const auth: AuthDto = { accessToken: 'token', refreshToken: 'refresh' };

    expect(() =>
      validateAndNormalizeConnectionAuth(auth, buildIntegration({ providerId: ChatProviderIdEnum.Discord }))
    ).to.throw(/Token rotation is not supported/);
  });

  it('throws when a rotating provider is missing OAuth credentials', () => {
    const auth: AuthDto = { accessToken: 'token', refreshToken: 'refresh' };

    expect(() => validateAndNormalizeConnectionAuth(auth, buildIntegration({ credentials: {} }))).to.throw(
      /must have clientId and secretKey/
    );
  });

  it('skips the credential check for the Novu-managed Slack provider', () => {
    const auth: AuthDto = { accessToken: 'token', refreshToken: 'refresh' };

    const result = validateAndNormalizeConnectionAuth(
      auth,
      buildIntegration({ providerId: ChatProviderIdEnum.Novu, credentials: {} })
    );

    expect(result.expiresAt).to.be.a('string');
  });
});

describe('canCallerManageChannelConnection', () => {
  const caller = { subscriberId: 'sub-1', contextKeys: ['tenant:a'] };

  it('allows the owning subscriber in the same context', () => {
    expect(canCallerManageChannelConnection({ subscriberId: 'sub-1', contextKeys: ['tenant:a'] }, caller)).to.equal(
      true
    );
  });

  it('refuses another subscriber connection', () => {
    expect(canCallerManageChannelConnection({ subscriberId: 'sub-2', contextKeys: ['tenant:a'] }, caller)).to.equal(
      false
    );
  });

  it('refuses the owning subscriber in a different context', () => {
    expect(canCallerManageChannelConnection({ subscriberId: 'sub-1', contextKeys: ['tenant:b'] }, caller)).to.equal(
      false
    );
  });

  it('allows a shared connection scoped to the caller exact context', () => {
    expect(canCallerManageChannelConnection({ subscriberId: undefined, contextKeys: ['tenant:a'] }, caller)).to.equal(
      true
    );
  });

  it('refuses a shared connection scoped to another context', () => {
    expect(canCallerManageChannelConnection({ subscriberId: undefined, contextKeys: ['tenant:b'] }, caller)).to.equal(
      false
    );
  });

  it('refuses an environment-wide shared connection, even for a caller without context', () => {
    expect(canCallerManageChannelConnection({ subscriberId: undefined, contextKeys: [] }, caller)).to.equal(false);
    expect(
      canCallerManageChannelConnection(
        { subscriberId: undefined, contextKeys: [] },
        {
          subscriberId: 'sub-1',
          contextKeys: [],
        }
      )
    ).to.equal(false);
  });
});
