import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';
import { RequirePermissions } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { ApiCommonResponses } from '../shared/framework/response.decorator';
import { KeylessAccessible } from '../shared/framework/swagger/keyless.security';
import { UserSession } from '../shared/framework/user.decorator';
import { HumanAgentQueryDto } from './dtos/human-agent.dto';
import {
  type ConnectCodeResponseDto,
  ConnectHostRequestDto,
  type ConnectHostResponseDto,
  CreateConnectCodeRequestDto,
  type HumanHostStatusResponseDto,
} from './dtos/human-host.dto';
import { HumanHostStatusService } from './services/human-host-status.service';
import { HumanInboxService } from './services/human-inbox.service';
import { ConnectHostCommand } from './usecases/connect-host/connect-host.command';
import { ConnectHost } from './usecases/connect-host/connect-host.usecase';
import { CreateConnectCodeCommand } from './usecases/create-connect-code/create-connect-code.command';
import { CreateConnectCode } from './usecases/create-connect-code/create-connect-code.usecase';

/**
 * The hosts of the relay agent: a one-time code for one more host to connect with, and whether any host
 * is connected and when it last checked the inbox.
 */
@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@Controller('/human/agent')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
@RequireAuthentication()
export class HumanHostsController {
  constructor(
    private readonly createConnectCodeUsecase: CreateConnectCode,
    private readonly inbox: HumanInboxService,
    private readonly hostStatus: HumanHostStatusService
  ) {}

  /**
   * The code for `agentinbox connect <handle> --code <code>`. It hands out this environment's key, so
   * asking for one takes the right to read that key.
   */
  @Post('/connect-codes')
  @HttpCode(HttpStatus.OK)
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.API_KEY_READ)
  createConnectCode(
    @UserSession() user: UserSessionData,
    @Body() body: CreateConnectCodeRequestDto
  ): Promise<ConnectCodeResponseDto> {
    return this.createConnectCodeUsecase.execute(
      CreateConnectCodeCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        agentIdentifier: body.agentIdentifier,
        handle: body.handle,
      })
    );
  }

  @Get('/hosts')
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  async getHosts(
    @UserSession() user: UserSessionData,
    @Query() query: HumanAgentQueryDto
  ): Promise<HumanHostStatusResponseDto> {
    const scope = { environmentId: user.environmentId, organizationId: user.organizationId };
    const agent = await this.inbox.resolveRelayAgent(scope, query.agentIdentifier);

    return this.hostStatus.describe(scope, agent);
  }
}

/**
 * Public: `agentinbox connect` trades a one-time code for the key of the agent's account. The code is the
 * only credential. Each one works once, and every agent takes only so many wrong codes at a time.
 */
@ThrottlerCategory(ApiRateLimitCategoryEnum.CONFIGURATION)
@ApiCommonResponses()
@Controller('/human/connect')
@ApiExcludeController()
export class HumanConnectPublicController {
  constructor(private readonly connectHostUsecase: ConnectHost) {}

  @Post('/')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connect a host to an agent with a one-time code from agentinbox.md' })
  connect(@Body() body: ConnectHostRequestDto): Promise<ConnectHostResponseDto> {
    return this.connectHostUsecase.execute(ConnectHostCommand.create({ agent: body.agent, code: body.code }));
  }
}
