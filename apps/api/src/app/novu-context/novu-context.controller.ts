import { ClassSerializerInterceptor, Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import { SkipPermissionsCheck } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { ApiCommonResponses } from '../shared/framework/response.decorator';
import { UserSession } from '../shared/framework/user.decorator';
import { BuildNovuContextCommand } from './usecases/build-novu-context/build-novu-context.command';
import { BuildNovuContext, type NovuConnectContext } from './usecases/build-novu-context/build-novu-context.usecase';

/**
 * Dashboard-facing endpoint that mints a signed binding for the dashboard's own session against
 * Novu's hosted Novu app. Not agent-scoped: it powers both the dogfooded dashboard Inbox HMAC and
 * the NovuCopilot Slack connect flow, which both authenticate as the same hosted-app subscriber.
 * Runs in the customer's authenticated session; requires authentication only.
 */
@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/novu')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
@RequireAuthentication()
export class NovuContextController {
  constructor(private readonly buildNovuContextUsecase: BuildNovuContext) {}

  @Get('/context')
  @ApiOperation({
    summary: 'Build the Novu hosted-app connect context',
    description:
      'Returns the customer tenant `context` plus a `contextHash`, and a `subscriberHash` for the ' +
      'authenticated user, all signed with the hosted Novu app environment secret key. Consumed by ' +
      'the dashboard Inbox and the NovuCopilot Slack connect flow so the cross-org (Novu-hosted) ' +
      'connection carries a server-minted, HMAC-verifiable tenant binding and subscriber auth ' +
      'rather than browser-forged ones.',
  })
  @SkipPermissionsCheck()
  buildNovuContext(@UserSession() user: UserSessionData): Promise<NovuConnectContext> {
    return this.buildNovuContextUsecase.execute(
      BuildNovuContextCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }
}
