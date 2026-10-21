import {
  BadRequestException,
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiExcludeController } from '@nestjs/swagger';
import { RequirePermissions } from '@novu/application-generic';
import {
  ApiAuthSchemeEnum,
  ApiRateLimitCategoryEnum,
  NOVU_ANALYTICS_SOURCE_HEADER,
  PermissionsEnum,
  UserSessionData,
} from '@novu/shared';
import { AgentInboxAddressService } from '../agents/email/novu-email/agent-inbox-address.service';
import { RequireAuthentication } from '../auth/framework/auth.decorator';
import { ExternalApiAccessible } from '../auth/framework/external-api.decorator';
import { ThrottlerCategory } from '../rate-limiting/guards';
import { KeylessAccessible } from '../shared/framework/swagger/keyless.security';
import { UserSession } from '../shared/framework/user.decorator';
import { isResolvedKeylessAuthScheme } from '../shared/utils/auth.utils';
import { CreateInteractionRequestDto } from './dtos/create-interaction-request.dto';
import {
  CheckInboxAddressQueryDto,
  type CheckInboxAddressResponseDto,
  HumanAgentQueryDto,
  HumanAgentResponseDto,
  SendHumanTestEmailRequestDto,
  type SendHumanTestEmailResponseDto,
  UpdateHumanAgentRequestDto,
} from './dtos/human-agent.dto';
import {
  CreateHumanInviteRequestDto,
  CreateHumanInviteResponseDto,
  RequestAddressVerificationDto,
  RequestAddressVerificationResponseDto,
} from './dtos/human-invite.dto';
import {
  ChangeOperatorEmailRequestDto,
  SetOperatorDefaultChannelRequestDto,
  SetOperatorDefaultChannelResponseDto,
} from './dtos/human-operator-contact.dto';
import { InteractionResponseDto } from './dtos/interaction-response.dto';
import type { KeylessClaimTokenResponseDto } from './dtos/keyless-claim-token.dto';
import { ListContactsQueryDto, ListContactsResponseDto, RemoveContactResponseDto } from './dtos/list-contacts.dto';
import { ListInteractionsQueryDto } from './dtos/list-interactions-query.dto';
import {
  HumanOperatorResponseDto,
  SetupHumanRelayRequestDto,
  SetupHumanRelayResponseDto,
} from './dtos/setup-human-relay.dto';
import { HumanAgentPausedGuard } from './guards/human-agent-paused.guard';
import { assertFromHumanDashboard } from './guards/human-dashboard-secret.guard';
import { readAnalyticsSource } from './services/agent-inbox-analytics';
import {
  AGENT_PICTURE_FIELD,
  AGENT_PICTURE_MAX_BYTES,
  HumanAgentPictureService,
} from './services/human-agent-picture.service';
import { HumanOperatorService } from './services/human-operator.service';
import { CancelInteractionCommand } from './usecases/cancel-interaction/cancel-interaction.command';
import { CancelInteraction } from './usecases/cancel-interaction/cancel-interaction.usecase';
import { ChangeOperatorEmailCommand } from './usecases/change-operator-email/change-operator-email.command';
import { ChangeOperatorEmail } from './usecases/change-operator-email/change-operator-email.usecase';
import { CreateHumanInviteCommand } from './usecases/create-human-invite/create-human-invite.command';
import { CreateHumanInvite } from './usecases/create-human-invite/create-human-invite.usecase';
import { CreateInteractionCommand } from './usecases/create-interaction/create-interaction.command';
import { CreateInteraction } from './usecases/create-interaction/create-interaction.usecase';
import { DeleteHumanAgentCommand } from './usecases/delete-human-agent/delete-human-agent.command';
import { DeleteHumanAgent } from './usecases/delete-human-agent/delete-human-agent.usecase';
import { GetContactCommand } from './usecases/get-contact/get-contact.command';
import { GetContact, type GetContactResult } from './usecases/get-contact/get-contact.usecase';
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
import { RequestAddressVerificationCommand } from './usecases/request-address-verification/request-address-verification.command';
import { RequestAddressVerification } from './usecases/request-address-verification/request-address-verification.usecase';
import { SendHumanTestEmailCommand } from './usecases/send-human-test-email/send-human-test-email.command';
import { SendHumanTestEmail } from './usecases/send-human-test-email/send-human-test-email.usecase';
import { SetOperatorDefaultChannelCommand } from './usecases/set-operator-default-channel/set-operator-default-channel.command';
import { SetOperatorDefaultChannel } from './usecases/set-operator-default-channel/set-operator-default-channel.usecase';
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
    private readonly getContactUsecase: GetContact,
    private readonly removeContactUsecase: RemoveContact,
    private readonly createHumanInviteUsecase: CreateHumanInvite,
    private readonly requestAddressVerificationUsecase: RequestAddressVerification,
    private readonly getKeylessClaimTokenUsecase: GetKeylessClaimToken,
    private readonly humanOperator: HumanOperatorService,
    private readonly updateHumanAgentUsecase: UpdateHumanAgent,
    private readonly deleteHumanAgentUsecase: DeleteHumanAgent,
    private readonly humanAgentPicture: HumanAgentPictureService,
    private readonly setOperatorDefaultChannelUsecase: SetOperatorDefaultChannel,
    private readonly changeOperatorEmailUsecase: ChangeOperatorEmail,
    private readonly sendHumanTestEmailUsecase: SendHumanTestEmail,
    private readonly inboxAddresses: AgentInboxAddressService
  ) {}

  @Post('/interactions')
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  @UseGuards(HumanAgentPausedGuard)
  createInteraction(
    @UserSession() user: UserSessionData,
    @Body(new ValidationPipe({ transform: true, whitelist: true, forbidUnknownValues: false }))
    body: CreateInteractionRequestDto,
    @Headers(NOVU_ANALYTICS_SOURCE_HEADER) analyticsSource?: string
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
        anyoneMayAnswer: body.anyoneMayAnswer,
        via: body.via,
        agentIdentifier: body.agentIdentifier,
        from: body.from,
        ttlSeconds: body.ttlSeconds,
        analyticsSource: readAnalyticsSource(analyticsSource),
      })
    );
  }

  @Get('/interactions')
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  @UseGuards(HumanAgentPausedGuard)
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
  @UseGuards(HumanAgentPausedGuard)
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
  @UseGuards(HumanAgentPausedGuard)
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

  @Get('/contacts/:subscriberId')
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  getContact(
    @UserSession() user: UserSessionData,
    @Param('subscriberId') subscriberId: string,
    @Query('agentIdentifier') agentIdentifier?: string
  ): Promise<GetContactResult> {
    return this.getContactUsecase.execute(
      GetContactCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        subscriberId,
        agentIdentifier,
      })
    );
  }

  @Post('/verifications')
  @HttpCode(HttpStatus.OK)
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  requestVerification(
    @UserSession() user: UserSessionData,
    @Body() body: RequestAddressVerificationDto
  ): Promise<RequestAddressVerificationResponseDto> {
    return this.requestAddressVerificationUsecase.execute(
      RequestAddressVerificationCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        subscriberId: body.subscriberId,
        via: body.via,
        address: body.address,
        agentIdentifier: body.agentIdentifier,
        firstName: body.firstName,
        lastName: body.lastName,
        setDefaultVia: true,
      })
    );
  }

  /**
   * Whether an Agent Inbox handle is free. Asked while the operator types one. A taken handle comes
   * back with a nearby free one. With no handle, the answer is only the mailbox domain this deployment publishes.
   */
  @Get('/inbox-address')
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_READ)
  checkInboxAddress(@Query() query: CheckInboxAddressQueryDto): Promise<CheckInboxAddressResponseDto> {
    return this.inboxAddresses.check(query.handle, query.email);
  }

  @Post('/setup')
  @HttpCode(HttpStatus.OK)
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  setup(
    @UserSession() user: UserSessionData,
    @Body() body: SetupHumanRelayRequestDto,
    @Headers(NOVU_ANALYTICS_SOURCE_HEADER) analyticsSource?: string
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
        inboxHandle: body.inboxHandle,
        email: body.email,
        firstName: body.firstName,
        lastName: body.lastName,
        defaultVia: body.defaultVia,
        analyticsSource: readAnalyticsSource(analyticsSource),
      })
    );
  }

  /**
   * Changes the relay agent `human setup` made: renames or describes it (people see that on the invite
   * page, in emails and on the agent's Telegram bot), sets who can reach it, and pauses or resumes it.
   * Who can reach it and pausing are the operator's, on the dashboard; a host gets 403 `dashboard_only`.
   */
  @Patch('/agent')
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  updateAgent(
    @UserSession() user: UserSessionData,
    @Body() body: UpdateHumanAgentRequestDto,
    @Headers() headers: Record<string, unknown>
  ): Promise<HumanAgentResponseDto> {
    if (body.reach !== undefined || body.paused !== undefined) {
      assertFromHumanDashboard(headers);
    }

    return this.updateHumanAgentUsecase.execute(
      UpdateHumanAgentCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        agentIdentifier: body.agentIdentifier,
        name: body.name,
        description: body.description,
        reach: body.reach,
        paused: body.paused,
      })
    );
  }

  /**
   * Deletes the relay agent for good: its address, channels, conversations and what hosts it had, so the
   * address can be taken again. Contacts and the account stay. Afterwards `GET /human/agent` answers 404,
   * as it does before `human setup`. Only the operator's dashboard may; a host gets 403 `dashboard_only`.
   */
  @Delete('/agent')
  @HttpCode(HttpStatus.NO_CONTENT)
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  async deleteAgent(
    @UserSession() user: UserSessionData,
    @Query() query: HumanAgentQueryDto,
    @Headers() headers: Record<string, unknown>
  ): Promise<void> {
    assertFromHumanDashboard(headers);

    await this.deleteHumanAgentUsecase.execute(
      DeleteHumanAgentCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        agentIdentifier: query.agentIdentifier,
      })
    );
  }

  /**
   * The onboarding test. Mail leaves from the Agent Email Inbox, addressed to the operator, so their reply
   * comes back to that inbox. Only the operator's dashboard may send it.
   */
  @Post('/agent/test-email')
  @HttpCode(HttpStatus.OK)
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  sendTestEmail(
    @UserSession() user: UserSessionData,
    @Body() body: SendHumanTestEmailRequestDto,
    @Headers() headers: Record<string, unknown>
  ): Promise<SendHumanTestEmailResponseDto> {
    assertFromHumanDashboard(headers);

    return this.sendHumanTestEmailUsecase.execute(
      SendHumanTestEmailCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        agentIdentifier: body.agentIdentifier,
        email: body.email,
      })
    );
  }

  /**
   * The relay agent with its name, description, picture, who can reach it and whether it is paused. A 404
   * before `human setup` has made it.
   */
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
   * The operator picks which of their connected channels agents use when a message names none. It is their
   * own choice, so an inviter's `--via` never replaces it.
   */
  @Put('/operator/default-channel')
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  setOperatorDefaultChannel(
    @UserSession() user: UserSessionData,
    @Body() body: SetOperatorDefaultChannelRequestDto
  ): Promise<SetOperatorDefaultChannelResponseDto> {
    return this.setOperatorDefaultChannelUsecase.execute(
      SetOperatorDefaultChannelCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        via: body.via,
        agentIdentifier: body.agentIdentifier,
      })
    );
  }

  /**
   * Sends a confirmation link to a new address for the operator, or to the one they signed up with. Agents
   * keep emailing a verified address until the new one is confirmed. The default channel stays as it is.
   */
  @Post('/operator/email')
  @HttpCode(HttpStatus.OK)
  @KeylessAccessible()
  @ExternalApiAccessible()
  @RequirePermissions(PermissionsEnum.AGENT_WRITE)
  changeOperatorEmail(
    @UserSession() user: UserSessionData,
    @Body() body: ChangeOperatorEmailRequestDto
  ): Promise<RequestAddressVerificationResponseDto> {
    return this.changeOperatorEmailUsecase.execute(
      ChangeOperatorEmailCommand.create({
        environmentId: user.environmentId,
        organizationId: user.organizationId,
        userId: user._id,
        address: body.address,
        agentIdentifier: body.agentIdentifier,
      })
    );
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
    @Body() body: CreateHumanInviteRequestDto,
    @Headers(NOVU_ANALYTICS_SOURCE_HEADER) analyticsSource?: string
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
        analyticsSource: readAnalyticsSource(analyticsSource),
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
    throw new ForbiddenException('A picture needs an Agent Inbox account. Run `npx @agentinbox/cli login` first.');
  }
}
