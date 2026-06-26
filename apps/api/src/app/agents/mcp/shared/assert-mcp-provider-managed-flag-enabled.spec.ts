import { ForbiddenException } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

import { assertMcpProviderManagedFlagEnabled } from './assert-mcp-provider-managed-flag-enabled';

describe('assertMcpProviderManagedFlagEnabled', () => {
  let featureFlagsService: sinon.SinonStubbedInstance<FeatureFlagsService>;

  beforeEach(() => {
    featureFlagsService = sinon.createStubInstance(FeatureFlagsService);
  });

  it('passes when the rollout flag is enabled', async () => {
    featureFlagsService.getFlag.resolves(true);

    await assertMcpProviderManagedFlagEnabled({
      featureFlagsService: featureFlagsService as never,
      mcpId: 'slack',
      environmentId: 'env_1',
      organizationId: 'org_1',
    });

    expect(featureFlagsService.getFlag.calledOnce).to.equal(true);
    expect(featureFlagsService.getFlag.firstCall.args[0]).to.deep.include({
      key: FeatureFlagsKeysEnum.IS_MCP_PROVIDER_MANAGED_ENABLED,
      defaultValue: false,
    });
  });

  it('throws mcp_provider_managed_disabled when the flag is off', async () => {
    featureFlagsService.getFlag.resolves(false);

    try {
      await assertMcpProviderManagedFlagEnabled({
        featureFlagsService: featureFlagsService as never,
        mcpId: 'slack',
        environmentId: 'env_1',
        organizationId: 'org_1',
      });
      expect.fail('Expected ForbiddenException');
    } catch (err) {
      expect(err).to.be.instanceOf(ForbiddenException);
      expect((err as ForbiddenException).getResponse()).to.deep.include({
        error: 'mcp_provider_managed_disabled',
      });
    }
  });
});
