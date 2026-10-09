import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseInterceptors,
  ValidationPipe,
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
  CreateInboxInteractionRequestDto,
  GetInboxThreadQueryDto,
  type GetInboxThreadResponseDto,
  InboxThreadActionQueryDto,
  type InboxThreadDto,
  ListInboxQueryDto,
  type ListInboxResponseDto,
  ReplyInboxThreadRequestDto,
  type ReplyInboxThreadResponseDto,
} from './dtos/human-inbox.dto';
import type { InteractionResponseDto } from './dtos/interaction-response.dto';
import { CreateInboxInteractionCommand } from './usecases/create-inbox-interaction/create-inbox-interaction.command';
import { CreateInboxInteraction } from './usecases/create-inbox-interaction/create-inbox-interaction.usecase';
import { GetInboxThreadCommand } from './usecases/get-inbox-thread/get-inbox-thread.command';
import { GetInboxThread } from './usecases/get-inbox-thread/get-inbox-thread.usecase';
import { InboxThreadCommand } from './usecases/inbox-thread.command';
import { ListInboxThreadsCommand } from './usecases/list-inbox-threads/list-inbox-threads.command';
import { ListInboxThreads } from './usecases/list-inbox-threads/list-inbox-threads.usecase';
import { MarkInboxRead } from './usecases/mark-inbox-read/mark-inbox-read.usecase';
import { ReplyInboxThreadCommand } from './usecases/reply-inbox-thread/reply-inbox-thread.command';
import { ReplyInboxThread } from './usecases/reply-inbox-thread/reply-inbox-thread.usecase';
import { ResolveInboxThread } from './usecases/resolve-inbox-thread/resolve-inbox-thread.usecase';

/**
 * The relay agent's conversations as one inbox across Telegram, Slack and email: list and pull
 * threads, answer them on the channel they came from, and close them.
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
    private readonly resolveInboxThreadUsecase: ResolveInboxThread,
    private readonly replyInboxThreadUsecase: ReplyInboxThread,
    private readonly createInboxInteractionUsecase: CreateInboxInteraction
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
        unreadOnly: query.unread,
        includeResolved: query.all,
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

  @Post('/:identifier/reply')
  @HttpCode(HttpStatus.OK)
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  replyInboxThread(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Query() query: InboxThreadActionQueryDto,
    @Body() body: ReplyInboxThreadRequestDto
  ): Promise<ReplyInboxThreadResponseDto> {
    return this.replyInboxThreadUsecase.execute(
      ReplyInboxThreadCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        identifier,
        agentIdentifier: query.agentIdentifier,
        text: body.text,
      })
    );
  }

  @Post('/:identifier/interactions')
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  createInboxInteraction(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Query() query: InboxThreadActionQueryDto,
    // `whitelist` keeps a raw card element with attacker-controlled actions out, as on `/human/interactions`.
    @Body(new ValidationPipe({ transform: true, whitelist: true, forbidUnknownValues: false }))
    body: CreateInboxInteractionRequestDto
  ): Promise<InteractionResponseDto> {
    return this.createInboxInteractionUsecase.execute(
      CreateInboxInteractionCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        identifier,
        agentIdentifier: query.agentIdentifier,
        kind: body.kind,
        card: body.card,
        from: body.from,
        ttlSeconds: body.ttlSeconds,
      })
    );
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
