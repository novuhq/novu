import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { RequirePermissions } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { UserSession } from '../shared/framework/user.decorator';
import { HumanAgentQueryDto } from './dtos/human-agent.dto';
import {
  ConnectHumanWhatsAppRequestDto,
  type ConnectHumanWhatsAppResponseDto,
  type HumanWhatsAppFirstMessageDto,
  type HumanWhatsAppLinkResponseDto,
  type HumanWhatsAppSetupResponseDto,
  SubmitHumanWhatsAppFirstMessageRequestDto,
} from './dtos/human-whatsapp.dto';
import { assertFromHumanDashboard } from './guards/human-dashboard-secret.guard';
import { HumanOperatorService } from './services/human-operator.service';
import { ConnectHumanWhatsAppCommand } from './usecases/human-whatsapp/connect-human-whatsapp.command';
import { ConnectHumanWhatsApp } from './usecases/human-whatsapp/connect-human-whatsapp.usecase';
import { GetHumanWhatsAppSetupCommand } from './usecases/human-whatsapp/get-human-whatsapp-setup.command';
import { GetHumanWhatsAppSetup } from './usecases/human-whatsapp/get-human-whatsapp-setup.usecase';
import { IssueHumanWhatsAppLink } from './usecases/human-whatsapp/issue-human-whatsapp-link.usecase';
import { SubmitHumanWhatsAppFirstMessage } from './usecases/human-whatsapp/submit-human-whatsapp-first-message.usecase';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from './usecases/setup-human-relay/setup-human-relay.usecase';

/**
 * The operator's own WhatsApp Business account on the relay agent, connected with the Facebook button on
 * agentinbox.md. Connecting it and binding the operator's own number happen only on the operator's dashboard: a
 * host holding the same key gets 403. Reading where setup stands is open to the key, so the CLI can wait for it.
 */
@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@Controller('/human/agent/whatsapp')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
@RequireAuthentication()
export class HumanWhatsAppController {
  constructor(
    private readonly getHumanWhatsAppSetupUsecase: GetHumanWhatsAppSetup,
    private readonly connectHumanWhatsAppUsecase: ConnectHumanWhatsApp,
    private readonly issueHumanWhatsAppLinkUsecase: IssueHumanWhatsAppLink,
    private readonly humanOperator: HumanOperatorService,
    private readonly submitFirstMessageUsecase: SubmitHumanWhatsAppFirstMessage
  ) {}

  /**
   * Whether WhatsApp is offered, the public Meta ids for the Facebook button, and the linked numbers. Read-only and
   * free of credentials, so `channel add whatsapp` can wait here while the operator connects on agentinbox.md.
   */
  @Get('/')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.INTEGRATION_READ)
  getSetup(
    @UserSession() user: UserSessionData,
    @Query() query: HumanAgentQueryDto
  ): Promise<HumanWhatsAppSetupResponseDto> {
    return this.getHumanWhatsAppSetupUsecase.execute(
      GetHumanWhatsAppSetupCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        agentIdentifier: query.agentIdentifier ?? DEFAULT_HUMAN_RELAY_IDENTIFIER,
      })
    );
  }

  /** Finishes Embedded Signup with the code and ids the Facebook button handed back. */
  @Post('/embedded-signup')
  @HttpCode(HttpStatus.OK)
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.INTEGRATION_WRITE)
  connect(
    @UserSession() user: UserSessionData,
    @Body() body: ConnectHumanWhatsAppRequestDto,
    @Headers() headers: Record<string, unknown>
  ): Promise<ConnectHumanWhatsAppResponseDto> {
    assertFromHumanDashboard(headers);

    return this.connectHumanWhatsAppUsecase.execute(
      ConnectHumanWhatsAppCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        agentIdentifier: body.agentIdentifier ?? DEFAULT_HUMAN_RELAY_IDENTIFIER,
        code: body.code,
        wabaId: body.wabaId,
        phoneNumberId: body.phoneNumberId,
        integrationIdentifier: body.integrationIdentifier,
      })
    );
  }

  /**
   * A wa.me link with a one-time code for the operator's own number: sending it from WhatsApp binds that number.
   * Always for the operator; a contact gets theirs from their invite page.
   */
  @Post('/link')
  @HttpCode(HttpStatus.OK)
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.INTEGRATION_WRITE)
  async issueOperatorLink(
    @UserSession() user: UserSessionData,
    @Body() body: HumanAgentQueryDto,
    @Headers() headers: Record<string, unknown>
  ): Promise<HumanWhatsAppLinkResponseDto> {
    assertFromHumanDashboard(headers);

    const scope = {
      environmentId: user.environmentId,
      organizationId: user.organizationId,
      agentIdentifier: body.agentIdentifier ?? DEFAULT_HUMAN_RELAY_IDENTIFIER,
    };
    const { subscriberId } = await this.humanOperator.require(scope);

    return this.issueHumanWhatsAppLinkUsecase.execute({ ...scope, subscriberId });
  }

  /**
   * Sends the first message for outside the 24-hour window to Meta for review, as a template on the operator's own
   * WhatsApp Business account. Only from the operator's dashboard.
   */
  @Post('/first-message')
  @HttpCode(HttpStatus.OK)
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.INTEGRATION_WRITE)
  submitFirstMessage(
    @UserSession() user: UserSessionData,
    @Body() body: SubmitHumanWhatsAppFirstMessageRequestDto,
    @Headers() headers: Record<string, unknown>
  ): Promise<HumanWhatsAppFirstMessageDto> {
    assertFromHumanDashboard(headers, 'The first WhatsApp message is set on agentinbox.md.');

    return this.submitFirstMessageUsecase.execute({
      environmentId: user.environmentId,
      organizationId: user.organizationId,
      agentIdentifier: body.agentIdentifier ?? DEFAULT_HUMAN_RELAY_IDENTIFIER,
      body: body.body,
    });
  }
}
