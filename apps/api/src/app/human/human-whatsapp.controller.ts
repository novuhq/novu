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
  type HumanWhatsAppSetupResponseDto,
} from './dtos/human-whatsapp.dto';
import { assertFromHumanDashboard } from './guards/human-dashboard-secret.guard';
import { ConnectHumanWhatsAppCommand } from './usecases/human-whatsapp/connect-human-whatsapp.command';
import { ConnectHumanWhatsApp } from './usecases/human-whatsapp/connect-human-whatsapp.usecase';
import { GetHumanWhatsAppSetupCommand } from './usecases/human-whatsapp/get-human-whatsapp-setup.command';
import { GetHumanWhatsAppSetup } from './usecases/human-whatsapp/get-human-whatsapp-setup.usecase';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from './usecases/setup-human-relay/setup-human-relay.usecase';

/**
 * The operator's own WhatsApp Business account on the relay agent, connected with the Facebook button on
 * agentinbox.md. Only the operator's dashboard may call these: a host holding the same key gets 403.
 */
@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@Controller('/human/agent/whatsapp')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
@RequireAuthentication()
export class HumanWhatsAppController {
  constructor(
    private readonly getHumanWhatsAppSetupUsecase: GetHumanWhatsAppSetup,
    private readonly connectHumanWhatsAppUsecase: ConnectHumanWhatsApp
  ) {}

  /** Whether WhatsApp is offered, the public Meta ids for the Facebook button, and the linked number. */
  @Get('/')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.INTEGRATION_READ)
  getSetup(
    @UserSession() user: UserSessionData,
    @Query() query: HumanAgentQueryDto,
    @Headers() headers: Record<string, unknown>
  ): Promise<HumanWhatsAppSetupResponseDto> {
    assertFromHumanDashboard(headers);

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
      })
    );
  }
}
