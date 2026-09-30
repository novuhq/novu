import { Controller, Get, Param } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { RequirePermissions } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../../auth/framework/external-api.decorator';
import { ThrottlerCategory } from '../../rate-limiting/guards';
import { UserSession } from '../../shared/framework/user.decorator';
import { GeminiEnterpriseProvisioningService } from './gemini-enterprise-provisioning.service';

@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@Controller('/agents')
@ApiExcludeController()
@RequireAuthentication()
export class GeminiEnterpriseAgentCardController {
  constructor(private readonly provisioning: GeminiEnterpriseProvisioningService) {}

  /** Contains the endpoint secret, hence write permission. */
  @Get('/:identifier/integrations/:integrationIdentifier/gemini-enterprise/agent-card')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  async getAgentCard(
    @UserSession() user: UserSessionData,
    @Param('identifier') agentIdentifier: string,
    @Param('integrationIdentifier') integrationIdentifier: string
  ) {
    return this.provisioning.getAgentCard({
      agentIdentifier,
      integrationIdentifier,
      environmentId: user.environmentId,
      organizationId: user.organizationId,
    });
  }
}
