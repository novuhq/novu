import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { RequirePermissions } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, NOVU_ANALYTICS_SOURCE_HEADER, PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { KeylessAccessible } from '../shared/framework/swagger/keyless.security';
import { UserSession } from '../shared/framework/user.decorator';
import {
  GetInboxThreadQueryDto,
  type GetInboxThreadResponseDto,
  type InboxCountsResponseDto,
  InboxThreadActionQueryDto,
  type InboxThreadDto,
  InboxViewQueryDto,
  ListInboxQueryDto,
  type ListInboxResponseDto,
} from './dtos/human-inbox.dto';
import { HumanAgentPausedGuard } from './guards/human-agent-paused.guard';
import { readAnalyticsSource } from './services/agent-inbox-analytics';
import { AGENT_INBOX_VIA_HEADER, readHostVia } from './services/human-host-status.service';
import { CountInboxThreads } from './usecases/count-inbox-threads/count-inbox-threads.usecase';
import { GetInboxThreadCommand } from './usecases/get-inbox-thread/get-inbox-thread.command';
import { GetInboxThread } from './usecases/get-inbox-thread/get-inbox-thread.usecase';
import { InboxThreadCommand } from './usecases/inbox-thread.command';
import { InboxViewCommand, ListInboxThreadsCommand } from './usecases/list-inbox-threads/list-inbox-threads.command';
import { ListInboxThreads } from './usecases/list-inbox-threads/list-inbox-threads.usecase';
import { MarkInboxRead } from './usecases/mark-inbox-read/mark-inbox-read.usecase';
import { ResolveInboxThread } from './usecases/resolve-inbox-thread/resolve-inbox-thread.usecase';

/**
 * The relay agent's conversations as one inbox across Telegram, Slack and email: list and read
 * threads, mark them read, and close them. Sending into a thread is `POST /human/interactions`
 * with `thread`. While the agent is paused its hosts get none of it; the operator's dashboard does.
 */
@ThrottlerCategory(ApiRateLimitCategoryEnum.TRIGGER)
@Controller('/human/inbox')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
@RequireAuthentication()
export class HumanInboxController {
  constructor(
    private readonly listInboxThreadsUsecase: ListInboxThreads,
    private readonly countInboxThreadsUsecase: CountInboxThreads,
    private readonly getInboxThreadUsecase: GetInboxThread,
    private readonly markInboxReadUsecase: MarkInboxRead,
    private readonly resolveInboxThreadUsecase: ResolveInboxThread
  ) {}

  @Get('/')
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  @UseGuards(HumanAgentPausedGuard)
  listInboxThreads(
    @UserSession() user: UserSessionData,
    @Query() query: ListInboxQueryDto,
    @Headers(AGENT_INBOX_VIA_HEADER) via?: string,
    @Headers(NOVU_ANALYTICS_SOURCE_HEADER) analyticsSource?: string
  ): Promise<ListInboxResponseDto> {
    return this.listInboxThreadsUsecase.execute(
      ListInboxThreadsCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        filter: query.filter,
        status: query.status,
        senders: query.senders,
        tab: query.tab,
        channel: query.channel,
        search: query.search,
        limit: query.limit,
        after: query.after,
        waitSeconds: query.wait,
        agentIdentifier: query.agentIdentifier,
        hostVia: readHostVia(via),
        analyticsSource: readAnalyticsSource(analyticsSource),
      })
    );
  }

  // Declared before `/:identifier`, which would otherwise take `counts` for a thread.
  @Get('/counts')
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  @UseGuards(HumanAgentPausedGuard)
  countInboxThreads(
    @UserSession() user: UserSessionData,
    @Query() query: InboxViewQueryDto
  ): Promise<InboxCountsResponseDto> {
    return this.countInboxThreadsUsecase.execute(
      InboxViewCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        senders: query.senders,
        tab: query.tab,
        channel: query.channel,
        search: query.search,
        agentIdentifier: query.agentIdentifier,
      })
    );
  }

  @Get('/:identifier')
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  @UseGuards(HumanAgentPausedGuard)
  getInboxThread(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Query() query: GetInboxThreadQueryDto,
    @Headers(AGENT_INBOX_VIA_HEADER) via?: string,
    @Headers(NOVU_ANALYTICS_SOURCE_HEADER) analyticsSource?: string
  ): Promise<GetInboxThreadResponseDto> {
    return this.getInboxThreadUsecase.execute(
      GetInboxThreadCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        identifier,
        limit: query.limit,
        before: query.before,
        after: query.after,
        include: query.include,
        agentIdentifier: query.agentIdentifier,
        hostVia: readHostVia(via),
        analyticsSource: readAnalyticsSource(analyticsSource),
      })
    );
  }

  @Post('/:identifier/read')
  @HttpCode(HttpStatus.OK)
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  @UseGuards(HumanAgentPausedGuard)
  markInboxRead(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Query() query: InboxThreadActionQueryDto
  ): Promise<InboxThreadDto> {
    return this.markInboxReadUsecase.execute(this.threadCommand(user, identifier, query));
  }

  @Post('/:identifier/resolve')
  @HttpCode(HttpStatus.OK)
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  @UseGuards(HumanAgentPausedGuard)
  resolveInboxThread(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Query() query: InboxThreadActionQueryDto
  ): Promise<InboxThreadDto> {
    return this.resolveInboxThreadUsecase.execute(this.threadCommand(user, identifier, query));
  }

  private threadCommand(
    user: UserSessionData,
    identifier: string,
    query: InboxThreadActionQueryDto
  ): InboxThreadCommand {
    return InboxThreadCommand.create({
      environmentId: user.environmentId,
      organizationId: user.organizationId,
      userId: user._id,
      identifier,
      agentIdentifier: query.agentIdentifier,
    });
  }
}
