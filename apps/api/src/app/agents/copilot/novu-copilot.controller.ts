import { ClassSerializerInterceptor, Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import { RequirePermissions } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../../auth/framework/auth.decorator';
import { ThrottlerCategory } from '../../rate-limiting/guards';
import { ApiCommonResponses } from '../../shared/framework/response.decorator';
import { UserSession } from '../../shared/framework/user.decorator';
import { BuildCopilotConnectContextCommand } from './usecases/build-copilot-connect-context/build-copilot-connect-context.command';
import {
  BuildCopilotConnectContext,
  type CopilotConnectContext,
} from './usecases/build-copilot-connect-context/build-copilot-connect-context.usecase';

/**
 * Dashboard-facing endpoints for the Novu-hosted NovuCopilot agent. Kept separate
 * from the generic agent CRUD controller because these are copilot-specific and
 * run in the customer's authenticated session rather than operating on an agent
 * resource. The framework bridge for the same agent lives in
 * {@link NovuCopilotBridgeController}.
 */
@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/agents/copilot')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
@RequireAuthentication()
export class NovuCopilotController {
  constructor(private readonly buildCopilotConnectContextUsecase: BuildCopilotConnectContext) {}

  @Get('/connect-context')
  @ApiOperation({
    summary: 'Build the NovuCopilot Slack connect context',
    description:
      'Returns the customer tenant `context` plus a `contextHash`, and a `subscriberHash` for the ' +
      'supplied `userId`, all signed with the hosted agent environment secret key. Consumed by the ' +
      'dashboard Slack connect button so the cross-org (Novu-hosted) copilot connection carries a ' +
      'server-minted, HMAC-verifiable tenant binding and subscriber auth rather than browser-forged ones.',
  })
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  buildCopilotConnectContext(@UserSession() user: UserSessionData): Promise<CopilotConnectContext> {
    return this.buildCopilotConnectContextUsecase.execute(
      BuildCopilotConnectContextCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }
}
