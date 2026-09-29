import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { FeatureFlagsService, RequirePermissions } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../../auth/framework/external-api.decorator';
import { ThrottlerCategory } from '../../rate-limiting/guards';
import { UserSession } from '../../shared/framework/user.decorator';
import { isGeminiEnterpriseEnabled } from './gemini-enterprise-enabled';
import { GeminiEnterpriseProvisioningService } from './gemini-enterprise-provisioning.service';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@Controller('/agents')
@ApiExcludeController()
@RequireAuthentication()
export class GeminiEnterpriseAgentCardController {
  constructor(
    private readonly provisioning: GeminiEnterpriseProvisioningService,
    private readonly featureFlagsService: FeatureFlagsService
  ) {}

  /** Contains the endpoint secret, hence write permission. */
  @Get('/:identifier/integrations/:integrationIdentifier/gemini-enterprise/agent-card')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  async getAgentCard(
    @UserSession() user: UserSessionData,
    @Param('identifier') agentIdentifier: string,
    @Param('integrationIdentifier') integrationIdentifier: string
  ) {
    if (!(await isGeminiEnterpriseEnabled(this.featureFlagsService, user.organizationId, user.environmentId))) {
      throw new NotFoundException();
    }

    return this.provisioning.getAgentCard({
      agentIdentifier,
      integrationIdentifier,
      environmentId: user.environmentId,
      organizationId: user.organizationId,
    });
  }
}
