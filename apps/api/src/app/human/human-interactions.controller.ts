import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
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
import { ApiAuthSchemeEnum, ApiRateLimitCategoryEnum, PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { KeylessAccessible } from '../shared/framework/swagger/keyless.security';
import { UserSession } from '../shared/framework/user.decorator';
import { CreateInteractionRequestDto } from './dtos/create-interaction-request.dto';
import { CreateHumanInviteRequestDto, CreateHumanInviteResponseDto } from './dtos/human-invite.dto';
import { InteractionResponseDto } from './dtos/interaction-response.dto';
import type { KeylessClaimTokenResponseDto } from './dtos/keyless-claim-token.dto';
import { ListContactsQueryDto, ListContactsResponseDto, RemoveContactResponseDto } from './dtos/list-contacts.dto';
import { ListInteractionsQueryDto } from './dtos/list-interactions-query.dto';
import {
  HumanOperatorResponseDto,
  SetupHumanRelayRequestDto,
  SetupHumanRelayResponseDto,
} from './dtos/setup-human-relay.dto';
import { HumanOperatorService } from './services/human-operator.service';
import { CancelInteractionCommand } from './usecases/cancel-interaction/cancel-interaction.command';
import { CancelInteraction } from './usecases/cancel-interaction/cancel-interaction.usecase';
import { CreateHumanInviteCommand } from './usecases/create-human-invite/create-human-invite.command';
import { CreateHumanInvite } from './usecases/create-human-invite/create-human-invite.usecase';
import { CreateInteractionCommand } from './usecases/create-interaction/create-interaction.command';
import { CreateInteraction } from './usecases/create-interaction/create-interaction.usecase';
import { GetInteractionCommand } from './usecases/get-interaction/get-interaction.command';
import { GetInteraction } from './usecases/get-interaction/get-interaction.usecase';
import { GetKeylessClaimTokenCommand } from './usecases/get-keyless-claim-token/get-keyless-claim-token.command';
import { GetKeylessClaimToken } from './usecases/get-keyless-claim-token/get-keyless-claim-token.usecase';
import { ListContactsCommand } from './usecases/list-contacts/list-contacts.command';
import { ListContacts } from './usecases/list-contacts/list-contacts.usecase';
import { ListInteractionsCommand } from './usecases/list-interactions/list-interactions.command';
import { ListInteractions } from './usecases/list-interactions/list-interactions.usecase';
import { RemoveContactCommand } from './usecases/remove-contact/remove-contact.command';
import { RemoveContact } from './usecases/remove-contact/remove-contact.usecase';
import { SetupHumanRelayCommand } from './usecases/setup-human-relay/setup-human-relay.command';
import {
  DEFAULT_HUMAN_RELAY_IDENTIFIER,
  SetupHumanRelay,
} from './usecases/setup-human-relay/setup-human-relay.usecase';

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
    private readonly listContactsUsecase: ListContacts,
    private readonly removeContactUsecase: RemoveContact,
    private readonly createHumanInviteUsecase: CreateHumanInvite,
    private readonly getKeylessClaimTokenUsecase: GetKeylessClaimToken,
    private readonly humanOperator: HumanOperatorService
  ) {}

  @Post('/interactions')
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  createInteraction(
    @UserSession() user: UserSessionData,
    // `whitelist` strips unknown properties (e.g. a `type: 'card'` + `children`
    // card element) so this chrome-only endpoint cannot be coerced into posting
    // a raw card element with attacker-controlled action buttons.
    @Body(new ValidationPipe({ transform: true, whitelist: true, forbidUnknownValues: false }))
    body: CreateInteractionRequestDto
  ): Promise<InteractionResponseDto> {
    return this.createInteractionUsecase.execute(
      CreateInteractionCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        kind: body.kind,
        card: body.card,
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
   * address with `--to`. Each one says where the relay agent reaches them
   * (`channels`, `defaultVia`), whether they joined yet (`status`) and the
   * invite link still waiting for them (`invite`).
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
        agentIdentifier: query.agentIdentifier,
        includeInviteLinks: mayCreateInvites(user),
      })
    );
  }

  /**
   * Removes the contact for good: cancels their open interactions, retires their invite links and
   * deletes the subscriber behind them, so they leave the list and agents can't reach them.
   */
  @Delete('/contacts/:subscriberId')
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  removeContact(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string
  ): Promise<RemoveContactResponseDto> {
    return this.removeContactUsecase.execute(
      RemoveContactCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        subscriberId,
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
        operator: body.operator,
        agentIdentifier: body.agentIdentifier,
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        defaultVia: body.defaultVia,
      })
    );
  }

  /**
   * The account owner's own contact, so the CLI and the Human dashboard treat the same person as "you".
   * Nothing is created here; `POST /human/setup` with `operator` records one.
   */
  @Get('/operator')
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  async getOperator(@UserSession() user: UserSessionData): Promise<HumanOperatorResponseDto> {
    const subscriberId = await this.humanOperator.find({
      environmentId: user.environmentId,
      organizationId: user.organizationId,
      agentIdentifier: DEFAULT_HUMAN_RELAY_IDENTIFIER,
    });

    return subscriberId ? { subscriberId } : {};
  }

  /**
   * The claim token of the caller's keyless setup. `human login` hands it to the Human dashboard, so
   * signing in there also moves the setup into the operator's Human account.
   */
  @Post('/claim-token')
  @HttpCode(HttpStatus.OK)
  @KeylessAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  createClaimToken(@UserSession() user: UserSessionData): Promise<KeylessClaimTokenResponseDto> {
    return this.getKeylessClaimTokenUsecase.execute(
      GetKeylessClaimTokenCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
      })
    );
  }

  @Post('/invites')
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  createInvite(
    @UserSession() user: UserSessionData,
    @Body() body: CreateHumanInviteRequestDto
  ): Promise<CreateHumanInviteResponseDto> {
    return this.createHumanInviteUsecase.execute(
      CreateHumanInviteCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        subscriberId: body.subscriberId,
        agentIdentifier: body.agentIdentifier,
        firstName: body.firstName,
        lastName: body.lastName,
      })
    );
  }
}

/**
 * Whoever may create an invite may also see the links of the ones still waiting. An environment's own
 * key (the `human` CLI, the Human dashboard's server) always may; a signed-in member needs `AGENT_WRITE`.
 */
function mayCreateInvites(user: UserSessionData): boolean {
  if (user.scheme === ApiAuthSchemeEnum.API_KEY || user.scheme === ApiAuthSchemeEnum.KEYLESS) {
    return true;
  }

  return user.permissions?.includes(PermissionsEnum.AGENT_WRITE) === true;
}
