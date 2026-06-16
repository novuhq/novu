import { FeatureFlagsService } from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { resolveManagedAgentAlwaysAllowToolPermissions } from './resolve-managed-agent-always-allow-tool-permissions';

describe('resolveManagedAgentAlwaysAllowToolPermissions', () => {
  let featureFlagsService: sinon.SinonStubbedInstance<FeatureFlagsService>;

  beforeEach(() => {
    featureFlagsService = sinon.createStubInstance(FeatureFlagsService);
  });

  it('returns true when the feature flag is enabled', async () => {
    featureFlagsService.getFlag.resolves(true);

    const result = await resolveManagedAgentAlwaysAllowToolPermissions({
      featureFlagsService: featureFlagsService as never,
      environmentId: 'env-1',
      organizationId: 'org-1',
    });

    expect(result).to.equal(true);
    expect(featureFlagsService.getFlag.calledOnce).to.equal(true);
    expect(featureFlagsService.getFlag.firstCall.args[0]).to.deep.include({
      key: FeatureFlagsKeysEnum.IS_AGENT_DEFAULT_MCP_ALWAYS_ALLOW_ENABLED,
      defaultValue: false,
      environment: { _id: 'env-1' },
      organization: { _id: 'org-1' },
    });
  });

  it('returns false when the feature flag is disabled', async () => {
    featureFlagsService.getFlag.resolves(false);

    const result = await resolveManagedAgentAlwaysAllowToolPermissions({
      featureFlagsService: featureFlagsService as never,
      environmentId: 'env-1',
      organizationId: 'org-1',
    });

    expect(result).to.equal(false);
  });
});
