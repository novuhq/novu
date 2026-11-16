import { FeatureFlagsKeysEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { AgentInboxFeaturesService } from './agent-inbox-features.service';

describe('AgentInboxFeaturesService', () => {
  const picked = { shape: 'drop', color: 'coral', art: { kind: 'arcs', seed: 7 } } as const;

  function setup(enabled: boolean) {
    const featureFlagsService = { getFlag: sinon.stub().resolves(enabled) };

    return { service: new AgentInboxFeaturesService(featureFlagsService as never), featureFlagsService };
  }

  it('shows the look an agent’s operator picked once the new onboarding is on for its account', async () => {
    const { service, featureFlagsService } = setup(true);

    expect(await service.mascotLookOf({ _organizationId: 'org1', look: picked })).to.deep.equal(picked);
    expect(featureFlagsService.getFlag.firstCall.args[0]).to.deep.include({
      key: FeatureFlagsKeysEnum.IS_AGENT_INBOX_NEW_ONBOARDING_ENABLED,
      defaultValue: false,
      organization: { _id: 'org1' },
    });
  });

  it('shows the original look for an agent nobody picked one for, as its mascots are redrawn all the same', async () => {
    const { service } = setup(true);

    expect(await service.mascotLookOf({ _organizationId: 'org1' })).to.deep.equal({
      shape: 'orb',
      color: 'ember',
      art: { kind: 'rays', seed: 0 },
    });
  });

  it('shows no look before that, so the mascot stays as it always was', async () => {
    const { service } = setup(false);

    expect(await service.mascotLookOf({ _organizationId: 'org1', look: picked })).to.equal(null);
  });

  it('asks about a setup made without an account like any account, though it never has the new onboarding', async () => {
    const saved = process.env.KEYLESS_ORGANIZATION_ID;
    process.env.KEYLESS_ORGANIZATION_ID = 'keyless-org';
    const { service, featureFlagsService } = setup(true);

    try {
      expect(await service.areLooksOn('keyless-org')).to.equal(true);
      expect(await service.mascotLookOf({ _organizationId: 'keyless-org', look: picked })).to.deep.equal(picked);
      expect(featureFlagsService.getFlag.firstCall.args[0]).to.deep.include({ organization: { _id: 'keyless-org' } });

      // The onboarding and the new card stay off there, whatever the flag says.
      featureFlagsService.getFlag.resetHistory();
      expect(await service.isNewOnboardingEnabled('keyless-org')).to.equal(false);
      expect(featureFlagsService.getFlag.called).to.equal(false);
    } finally {
      if (saved === undefined) {
        delete process.env.KEYLESS_ORGANIZATION_ID;
      } else {
        process.env.KEYLESS_ORGANIZATION_ID = saved;
      }
    }
  });
});
