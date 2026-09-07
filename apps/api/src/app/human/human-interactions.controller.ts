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
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { KeylessAccessible } from '../shared/framework/swagger/keyless.security';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateInteractionRequestDto } from './dtos/create-interaction-request.dto';
import { InteractionResponseDto } from './dtos/interaction-response.dto';
import { ListContactsQueryDto, ListContactsResponseDto } from './dtos/list-contacts.dto';
import { ListInteractionsQueryDto } from './dtos/list-interactions-query.dto';
import { SetupHumanRelayRequestDto, SetupHumanRelayResponseDto } from './dtos/setup-human-relay.dto';
import { CancelInteractionCommand } from './usecases/cancel-interaction/cancel-interaction.command';
import { CancelInteraction } from './usecases/cancel-interaction/cancel-interaction.usecase';
import { CreateInteractionCommand } from './usecases/create-interaction/create-interaction.command';
import { CreateInteraction } from './usecases/create-interaction/create-interaction.usecase';
import { GetInteractionCommand } from './usecases/get-interaction/get-interaction.command';
import { GetInteraction } from './usecases/get-interaction/get-interaction.usecase';
import { ListContactsCommand } from './usecases/list-contacts/list-contacts.command';
import { ListContacts } from './usecases/list-contacts/list-contacts.usecase';
import { ListInteractionsCommand } from './usecases/list-interactions/list-interactions.command';
import { ListInteractions } from './usecases/list-interactions/list-interactions.usecase';
import { SetupHumanRelayCommand } from './usecases/setup-human-relay/setup-human-relay.command';
import { SetupHumanRelay } from './usecases/setup-human-relay/setup-human-relay.usecase';

@ThrottlerCategory(ApiRateLimitCategoryEnum.TRIGGER)
@Controller('/human')
@UseInterceptors(ClassSerializerInterceptor)
@ApiExcludeController()
@RequireAuthentication()
export class HumanInteractionsController {
  constructor(
    private readonly createInteractionUsecase: CreateInteraction,
    private readonly getInteractionUsecase: GetInteraction,
    private readonly listInteractionsUsecase: ListInteractions,
    private readonly cancelInteractionUsecase: CancelInteraction,
    private readonly setupHumanRelayUsecase: SetupHumanRelay,
    private readonly listContactsUsecase: ListContacts
  ) {}

  @Post('/interactions')
  @KeylessAccessible()
  @ExternalApiAccessible()
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
        via: body.via,
        agentIdentifier: body.agentIdentifier,
        from: body.from,
        ttlSeconds: body.ttlSeconds,
      })
    );
  }

  @Get('/interactions')
  @KeylessAccessible()
  @ExternalApiAccessible()
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
  @ExternalApiAccessible()
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

  @Post('/interactions/:identifier/cancel')
  @HttpCode(HttpStatus.OK)
  @KeylessAccessible()
  @ExternalApiAccessible()
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

  /**
   * Contacts are the environment's subscribers — the people an agent can
   * address with `--to`. Deliberately a thin subscriber list today; filters
   * and a per-contact `channels` field are the intended extension points.
   */
  @Get('/contacts')
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  listContacts(
    @UserSession() user: UserSessionData,
    @Query() query: ListContactsQueryDto
  ): Promise<ListContactsResponseDto> {
    return this.listContactsUsecase.execute(
      ListContactsCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        limit: query.limit,
        after: query.after,
      })
    );
  }

  @Post('/setup')
  @HttpCode(HttpStatus.OK)
  @KeylessAccessible()
  @ExternalApiAccessible()
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
        firstName: body.firstName,
        lastName: body.lastName,
      })
    );
  }
}
