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
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { RequirePermissions } from '@novu/application-generic';
import { ApiRateLimitCategoryEnum, PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { KeylessAccessible } from '../shared/framework/swagger/keyless.security';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateInteractionRequestDto } from './dtos/create-interaction-request.dto';
import { InteractionResponseDto } from './dtos/interaction-response.dto';
import { ListInteractionsQueryDto } from './dtos/list-interactions-query.dto';
import { SetupHumanRelayRequestDto, SetupHumanRelayResponseDto } from './dtos/setup-human-relay.dto';
import { CancelInteractionCommand } from './usecases/cancel-interaction/cancel-interaction.command';
import { CancelInteraction } from './usecases/cancel-interaction/cancel-interaction.usecase';
import { CreateInteractionCommand } from './usecases/create-interaction/create-interaction.command';
import { CreateInteraction } from './usecases/create-interaction/create-interaction.usecase';
import { GetInteractionCommand } from './usecases/get-interaction/get-interaction.command';
import { GetInteraction } from './usecases/get-interaction/get-interaction.usecase';
import { ListInteractionsCommand } from './usecases/list-interactions/list-interactions.command';
import { ListInteractions } from './usecases/list-interactions/list-interactions.usecase';
import { SetupHumanRelayCommand } from './usecases/setup-human-relay/setup-human-relay.command';
import { SetupHumanRelay } from './usecases/setup-human-relay/setup-human-relay.usecase';
import { WaitInteractionCommand } from './usecases/wait-interaction/wait-interaction.command';
import { WaitInteraction } from './usecases/wait-interaction/wait-interaction.usecase';

const DEFAULT_WAIT_TIMEOUT_SECONDS = 25;
const MAX_WAIT_TIMEOUT_SECONDS = 30;

@ThrottlerCategory(ApiRateLimitCategoryEnum.TRIGGER)
@Controller('/human')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
@RequireAuthentication()
export class HumanInteractionsController {
  constructor(
    private readonly createInteractionUsecase: CreateInteraction,
    private readonly getInteractionUsecase: GetInteraction,
    private readonly waitInteractionUsecase: WaitInteraction,
    private readonly listInteractionsUsecase: ListInteractions,
    private readonly cancelInteractionUsecase: CancelInteraction,
    private readonly setupHumanRelayUsecase: SetupHumanRelay
  ) {}

  @Post('/interactions')
  @KeylessAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  createInteraction(
    @UserSession() user: UserSessionData,
    @Body() body: CreateInteractionRequestDto
  ): Promise<InteractionResponseDto> {
    return this.createInteractionUsecase.execute(
      CreateInteractionCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        kind: body.kind,
        prompt: body.prompt,
        options: body.options,
        to: body.to,
        integrationIdentifier: body.integrationIdentifier,
        agentIdentifier: body.agentIdentifier,
        from: body.from,
        ttlSeconds: body.ttlSeconds,
      })
    );
  }

  @Get('/interactions')
  @KeylessAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  listInteractions(
    @UserSession() user: UserSessionData,
    @Query() query: ListInteractionsQueryDto
  ): Promise<{ data: InteractionResponseDto[] }> {
    return this.listInteractionsUsecase.execute(
      ListInteractionsCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        status: query.status,
        to: query.to,
        limit: query.limit,
        before: query.before,
      })
    );
  }

  @Get('/interactions/:identifier')
  @KeylessAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  getInteraction(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string
  ): Promise<InteractionResponseDto> {
    return this.getInteractionUsecase.execute(
      GetInteractionCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        identifier,
      })
    );
  }

  @Get('/interactions/:identifier/wait')
  @KeylessAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  waitInteraction(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string,
    @Query('timeoutSeconds') timeoutSeconds?: string
  ): Promise<InteractionResponseDto> {
    const parsed = Number(timeoutSeconds);
    const bounded =
      Number.isFinite(parsed) && parsed >= 1
        ? Math.min(Math.floor(parsed), MAX_WAIT_TIMEOUT_SECONDS)
        : DEFAULT_WAIT_TIMEOUT_SECONDS;

    return this.waitInteractionUsecase.execute(
      WaitInteractionCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        identifier,
        timeoutSeconds: bounded,
      })
    );
  }

  @Post('/interactions/:identifier/cancel')
  @HttpCode(HttpStatus.OK)
  @KeylessAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  cancelInteraction(
    @UserSession() user: UserSessionData,
    @Param('identifier') identifier: string
  ): Promise<InteractionResponseDto> {
    return this.cancelInteractionUsecase.execute(
      CancelInteractionCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        identifier,
      })
    );
  }

  @Post('/setup')
  @HttpCode(HttpStatus.OK)
  @KeylessAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  setup(
    @UserSession() user: UserSessionData,
    @Body() body: SetupHumanRelayRequestDto
  ): Promise<SetupHumanRelayResponseDto> {
    return this.setupHumanRelayUsecase.execute(
      SetupHumanRelayCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        subscriberId: body.subscriberId,
        agentIdentifier: body.agentIdentifier,
        email: body.email,
      })
    );
  }
}
