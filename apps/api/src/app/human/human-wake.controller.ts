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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { RequirePermissions } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { KeylessAccessible } from '../shared/framework/swagger/keyless.security';
import { UserSession } from '../shared/framework/user.decorator';
import { HumanAgentQueryDto } from './dtos/human-agent.dto';
import {
  type ListWakeMessagesResponseDto,
  ReleaseWakeLeaseRequestDto,
  type ReleaseWakeLeaseResponseDto,
  TakeWakeLeaseRequestDto,
  type WakeLeaseResponseDto,
  type WakeLeaseStatusResponseDto,
  WakeMessagesQueryDto,
  WakeTypingRequestDto,
  type WakeTypingResponseDto,
} from './dtos/human-wake.dto';
import { HumanAgentPausedGuard } from './guards/human-agent-paused.guard';
import {
  AGENT_INBOX_HOST_HEADER,
  AGENT_INBOX_VIA_HEADER,
  readHostId,
  readHostVia,
} from './services/human-host-status.service';
import { GetWakeLeaseCommand } from './usecases/get-wake-lease/get-wake-lease.command';
import { GetWakeLease } from './usecases/get-wake-lease/get-wake-lease.usecase';
import { ReleaseWakeLeaseCommand } from './usecases/release-wake-lease/release-wake-lease.command';
import { ReleaseWakeLease } from './usecases/release-wake-lease/release-wake-lease.usecase';
import { ShowWakeTypingCommand } from './usecases/show-wake-typing/show-wake-typing.command';
import { ShowWakeTyping } from './usecases/show-wake-typing/show-wake-typing.usecase';
import { TakeWakeLeaseCommand } from './usecases/take-wake-lease/take-wake-lease.command';
import { TakeWakeLease } from './usecases/take-wake-lease/take-wake-lease.usecase';
import { WaitForWakeMessagesCommand } from './usecases/wait-for-wake-messages/wait-for-wake-messages.command';
import { WaitForWakeMessages } from './usecases/wait-for-wake-messages/wait-for-wake-messages.usecase';

/**
 * Wake (`agentinbox wake`): the program that starts a host on the operator's computer when someone who can wake
 * it writes. One computer keeps the agent awake at a time, by a lease it renews, and only that computer waits for
 * the messages that may wake a host, and shows typing while its host works. Like the inbox, a paused agent's hosts
 * can't take the lease, wait or show typing; they can still see where it is awake and let go of it (`wake status`,
 * `wake stop`).
 */
@ThrottlerCategory(ApiRateLimitCategoryEnum.TRIGGER)
@Controller('/human/wake')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
@RequireAuthentication()
export class HumanWakeController {
  constructor(
    private readonly takeWakeLeaseUsecase: TakeWakeLease,
    private readonly getWakeLeaseUsecase: GetWakeLease,
    private readonly releaseWakeLeaseUsecase: ReleaseWakeLease,
    private readonly waitForWakeMessagesUsecase: WaitForWakeMessages,
    private readonly showWakeTypingUsecase: ShowWakeTyping
  ) {}

  /** Takes the lease, renews it, or with `takeOver` takes it from the computer that holds it. */
  @Post('/lease')
  @HttpCode(HttpStatus.OK)
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  @UseGuards(HumanAgentPausedGuard)
  takeLease(
    @UserSession() user: UserSessionData,
    @Body() body: TakeWakeLeaseRequestDto
  ): Promise<WakeLeaseResponseDto> {
    return this.takeWakeLeaseUsecase.execute(
      TakeWakeLeaseCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        agentIdentifier: body.agentIdentifier,
        computerId: body.computerId,
        computerName: body.computerName,
        host: body.host,
        project: body.project || undefined,
        takeOver: body.takeOver,
      })
    );
  }

  /** Where the agent is awake now, if anywhere, and whether it is paused. */
  @Get('/lease')
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  getLease(
    @UserSession() user: UserSessionData,
    @Query() query: HumanAgentQueryDto
  ): Promise<WakeLeaseStatusResponseDto> {
    return this.getWakeLeaseUsecase.execute(
      GetWakeLeaseCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        agentIdentifier: query.agentIdentifier,
      })
    );
  }

  /** Lets go of the lease (`agentinbox wake stop`), also while the agent is paused. */
  @Post('/lease/release')
  @HttpCode(HttpStatus.OK)
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  releaseLease(
    @UserSession() user: UserSessionData,
    @Body() body: ReleaseWakeLeaseRequestDto
  ): Promise<ReleaseWakeLeaseResponseDto> {
    return this.releaseWakeLeaseUsecase.execute(
      ReleaseWakeLeaseCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        agentIdentifier: body.agentIdentifier,
        computerId: body.computerId,
        host: body.host,
      })
    );
  }

  /** Waits for the messages that may wake a host. Only the computer and host holding the lease may. */
  @Get('/messages')
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  @UseGuards(HumanAgentPausedGuard)
  waitForMessages(
    @UserSession() user: UserSessionData,
    @Query() query: WakeMessagesQueryDto,
    @Headers(AGENT_INBOX_VIA_HEADER) via?: string,
    @Headers(AGENT_INBOX_HOST_HEADER) host?: string
  ): Promise<ListWakeMessagesResponseDto> {
    return this.waitForWakeMessagesUsecase.execute(
      WaitForWakeMessagesCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        agentIdentifier: query.agentIdentifier,
        computerId: query.computerId,
        host: query.host,
        after: query.after,
        waitSeconds: query.wait,
        limit: query.limit,
        hostVia: readHostVia(via),
        hostId: readHostId(host),
      })
    );
  }

  /** Shows in the chat that a reply is coming, while the woken host works on a message there. Asked again every few seconds. */
  @Post('/typing')
  @HttpCode(HttpStatus.OK)
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  @UseGuards(HumanAgentPausedGuard)
  showTyping(@UserSession() user: UserSessionData, @Body() body: WakeTypingRequestDto): Promise<WakeTypingResponseDto> {
    return this.showWakeTypingUsecase.execute(
      ShowWakeTypingCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        agentIdentifier: body.agentIdentifier,
        computerId: body.computerId,
        host: body.host,
        conversationId: body.conversationId,
      })
    );
  }
}
