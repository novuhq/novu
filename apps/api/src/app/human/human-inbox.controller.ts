import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { KeylessAccessible } from '../shared/framework/swagger/keyless.security';
import { UserSession } from '../shared/framework/user.decorator';
import {
  GetInboxThreadQueryDto,
  type GetInboxThreadResponseDto,
  InboxThreadActionQueryDto,
  type InboxThreadDto,
  ListInboxQueryDto,
  type ListInboxResponseDto,
} from './dtos/human-inbox.dto';
import { GetInboxThreadCommand } from './usecases/get-inbox-thread/get-inbox-thread.command';
import { GetInboxThread } from './usecases/get-inbox-thread/get-inbox-thread.usecase';
import { InboxThreadCommand } from './usecases/inbox-thread.command';
import { ListInboxThreadsCommand } from './usecases/list-inbox-threads/list-inbox-threads.command';
import { ListInboxThreads } from './usecases/list-inbox-threads/list-inbox-threads.usecase';
import { MarkInboxRead } from './usecases/mark-inbox-read/mark-inbox-read.usecase';
import { ResolveInboxThread } from './usecases/resolve-inbox-thread/resolve-inbox-thread.usecase';

/**
 * The relay agent's conversations as one inbox across Telegram, Slack and email: list and read
 * threads, mark them read, and close them. Sending into a thread is `POST /human/interactions`
 * with `thread`.
 */
@ThrottlerCategory(ApiRateLimitCategoryEnum.TRIGGER)
@Controller('/human/inbox')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
@RequireAuthentication()
export class HumanInboxController {
  constructor(
    private readonly listInboxThreadsUsecase: ListInboxThreads,
    private readonly getInboxThreadUsecase: GetInboxThread,
    private readonly markInboxReadUsecase: MarkInboxRead,
    private readonly resolveInboxThreadUsecase: ResolveInboxThread
  ) {}

  @Get('/')
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  listInboxThreads(
    @UserSession() user: UserSessionData,
    @Query() query: ListInboxQueryDto
  ): Promise<ListInboxResponseDto> {
    return this.listInboxThreadsUsecase.execute(
      ListInboxThreadsCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        filter: query.filter,
        status: query.status,
        senders: query.senders,
        limit: query.limit,
        after: query.after,
        waitSeconds: query.wait,
        agentIdentifier: query.agentIdentifier,
      })
    );
  }

  @Get('/:identifier')
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  getInboxThread(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Query() query: GetInboxThreadQueryDto
  ): Promise<GetInboxThreadResponseDto> {
    return this.getInboxThreadUsecase.execute(
      GetInboxThreadCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        identifier,
        limit: query.limit,
        before: query.before,
        agentIdentifier: query.agentIdentifier,
      })
    );
  }

  @Post('/:identifier/read')
  @HttpCode(HttpStatus.OK)
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
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
