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
  type ListenLeaseResponseDto,
  type ListenLeaseStatusResponseDto,
  ListenMessagesQueryDto,
  type ListenMessagesResponseDto,
  ListenTypingRequestDto,
  type ListenTypingResponseDto,
  ReleaseListenLeaseRequestDto,
  type ReleaseListenLeaseResponseDto,
  TakeListenLeaseRequestDto,
} from './dtos/human-listen.dto';
import { HumanAgentPausedGuard } from './guards/human-agent-paused.guard';
import {
  AGENT_INBOX_HOST_HEADER,
  AGENT_INBOX_VIA_HEADER,
  readHostId,
  readHostVia,
} from './services/human-host-status.service';
import { GetListenLeaseCommand } from './usecases/get-listen-lease/get-listen-lease.command';
import { GetListenLease } from './usecases/get-listen-lease/get-listen-lease.usecase';
import { ReleaseListenLeaseCommand } from './usecases/release-listen-lease/release-listen-lease.command';
import { ReleaseListenLease } from './usecases/release-listen-lease/release-listen-lease.usecase';
import { ShowListenTypingCommand } from './usecases/show-listen-typing/show-listen-typing.command';
import { ShowListenTyping } from './usecases/show-listen-typing/show-listen-typing.usecase';
import { TakeListenLeaseCommand } from './usecases/take-listen-lease/take-listen-lease.command';
import { TakeListenLease } from './usecases/take-listen-lease/take-listen-lease.usecase';
import { WaitForListenMessagesCommand } from './usecases/wait-for-listen-messages/wait-for-listen-messages.command';
import { WaitForListenMessages } from './usecases/wait-for-listen-messages/wait-for-listen-messages.usecase';

/**
 * The listener (`agentinbox listen`): the program that starts a host on the operator's computer when someone the
 * agent listens to writes. One computer keeps the agent listening at a time, by a lease it renews, and only that
 * computer waits for the messages that may start a host, and shows typing while its host works. Like the inbox, a
 * paused agent's hosts can't take the lease, wait or show typing; they can still see where it is listening and let go
 * of it (`listen status`, `listen stop`).
 */
@ThrottlerCategory(ApiRateLimitCategoryEnum.TRIGGER)
@Controller('/human/listen')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
@RequireAuthentication()
export class HumanListenController {
  constructor(
    private readonly takeListenLeaseUsecase: TakeListenLease,
    private readonly getListenLeaseUsecase: GetListenLease,
    private readonly releaseListenLeaseUsecase: ReleaseListenLease,
    private readonly waitForListenMessagesUsecase: WaitForListenMessages,
    private readonly showListenTypingUsecase: ShowListenTyping
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
    @Body() body: TakeListenLeaseRequestDto
  ): Promise<ListenLeaseResponseDto> {
    return this.takeListenLeaseUsecase.execute(
      TakeListenLeaseCommand.create({
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

  /** Where the agent is listening now, if anywhere, and whether it is paused. */
  @Get('/lease')
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  getLease(
    @UserSession() user: UserSessionData,
    @Query() query: HumanAgentQueryDto
  ): Promise<ListenLeaseStatusResponseDto> {
    return this.getListenLeaseUsecase.execute(
      GetListenLeaseCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        agentIdentifier: query.agentIdentifier,
      })
    );
  }

  /** Lets go of the lease (`agentinbox listen stop`), also while the agent is paused. */
  @Post('/lease/release')
  @HttpCode(HttpStatus.OK)
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  releaseLease(
    @UserSession() user: UserSessionData,
    @Body() body: ReleaseListenLeaseRequestDto
  ): Promise<ReleaseListenLeaseResponseDto> {
    return this.releaseListenLeaseUsecase.execute(
      ReleaseListenLeaseCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        agentIdentifier: body.agentIdentifier,
        computerId: body.computerId,
        host: body.host,
      })
    );
  }

  /** Waits for the messages that may start a host. Only the computer and host holding the lease may. */
  @Get('/messages')
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  @UseGuards(HumanAgentPausedGuard)
  waitForMessages(
    @UserSession() user: UserSessionData,
    @Query() query: ListenMessagesQueryDto,
    @Headers(AGENT_INBOX_VIA_HEADER) via?: string,
    @Headers(AGENT_INBOX_HOST_HEADER) host?: string
  ): Promise<ListenMessagesResponseDto> {
    return this.waitForListenMessagesUsecase.execute(
      WaitForListenMessagesCommand.create({
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

  /** Shows in the chat that a reply is coming, while the started host works on a message there. Asked again every few seconds. */
  @Post('/typing')
  @HttpCode(HttpStatus.OK)
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  @UseGuards(HumanAgentPausedGuard)
  showTyping(
    @UserSession() user: UserSessionData,
    @Body() body: ListenTypingRequestDto
  ): Promise<ListenTypingResponseDto> {
    return this.showListenTypingUsecase.execute(
      ShowListenTypingCommand.create({
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
