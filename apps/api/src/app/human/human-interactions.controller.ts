import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiExcludeController } from '@nestjs/swagger';
import { RequirePermissions } from '@novu/application-generic';
import { ApiAuthSchemeEnum, ApiRateLimitCategoryEnum, PermissionsEnum, UserSessionData } from '@novu/shared';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { KeylessAccessible } from '../shared/framework/swagger/keyless.security';
import { UserSession } from '../shared/framework/user.decorator';
import { isResolvedKeylessAuthScheme } from '../shared/utils/auth.utils';
import { CreateInteractionRequestDto } from './dtos/create-interaction-request.dto';
import { HumanAgentQueryDto, HumanAgentResponseDto, UpdateHumanAgentRequestDto } from './dtos/human-agent.dto';
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
import {
  AGENT_PICTURE_FIELD,
  AGENT_PICTURE_MAX_BYTES,
  HumanAgentPictureService,
} from './services/human-agent-picture.service';
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
import { UpdateHumanAgentCommand } from './usecases/update-human-agent/update-human-agent.command';
import { UpdateHumanAgent } from './usecases/update-human-agent/update-human-agent.usecase';

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
    private readonly humanOperator: HumanOperatorService,
    private readonly updateHumanAgentUsecase: UpdateHumanAgent,
    private readonly humanAgentPicture: HumanAgentPictureService
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
        thread: body.thread,
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
        subscriberId: query.subscriberId,
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
        agentName: body.agentName,
        agentDescription: body.agentDescription,
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        defaultVia: body.defaultVia,
      })
    );
  }

  /**
   * Renames or describes the relay agent `human setup` made. People see the change on the invite page,
   * in emails and on the agent's Telegram bot.
   */
  @Patch('/agent')
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  updateAgent(
    @UserSession() user: UserSessionData,
    @Body() body: UpdateHumanAgentRequestDto
  ): Promise<HumanAgentResponseDto> {
    return this.updateHumanAgentUsecase.execute(
      UpdateHumanAgentCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        agentIdentifier: body.agentIdentifier,
        name: body.name,
        description: body.description,
      })
    );
  }

  /** The relay agent with its name, description and picture. A 404 before `human setup` has made it. */
  @Get('/agent')
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  getAgent(@UserSession() user: UserSessionData, @Query() query: HumanAgentQueryDto): Promise<HumanAgentResponseDto> {
    return this.humanAgentPicture.get(relayOf(user, query.agentIdentifier));
  }

  /**
   * Gives the relay agent a picture: one JPEG or PNG of up to 2 MB, sent as a form upload. It needs an
   * account, because the picture is then served to anyone who opens an invite.
   */
  @Put('/agent/picture')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  @UseInterceptors(FileInterceptor(AGENT_PICTURE_FIELD, { limits: { files: 1, fileSize: AGENT_PICTURE_MAX_BYTES } }))
  async setAgentPicture(
    @UserSession() user: UserSessionData,
    @Query() query: HumanAgentQueryDto,
    @UploadedFile() picture?: { buffer: Buffer }
  ): Promise<HumanAgentResponseDto> {
    assertHasAccount(user);

    if (!picture?.buffer?.length) {
      throw new BadRequestException(`Send the picture as the "${AGENT_PICTURE_FIELD}" file of a form upload.`);
    }

    return this.humanAgentPicture.describe(
      await this.humanAgentPicture.save(relayOf(user, query.agentIdentifier), picture.buffer)
    );
  }

  @Delete('/agent/picture')
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  async removeAgentPicture(
    @UserSession() user: UserSessionData,
    @Query() query: HumanAgentQueryDto
  ): Promise<HumanAgentResponseDto> {
    assertHasAccount(user);

    return this.humanAgentPicture.describe(await this.humanAgentPicture.remove(relayOf(user, query.agentIdentifier)));
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

/** The relay agent a call is about: the one it names, or the one `human setup` makes when asked for no other. */
function relayOf(user: UserSessionData, agentIdentifier?: string) {
  return {
    environmentId: user.environmentId,
    organizationId: user.organizationId,
    agentIdentifier: agentIdentifier ?? DEFAULT_HUMAN_RELAY_IDENTIFIER,
  };
}

/** A setup without an account is a free demo anyone can start, so it can't publish files. */
function assertHasAccount(user: UserSessionData): void {
  if (isResolvedKeylessAuthScheme(user.scheme)) {
    throw new ForbiddenException('A picture needs a Human account. Run `human login` first.');
  }
}
