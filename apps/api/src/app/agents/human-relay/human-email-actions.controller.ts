import { Body, Controller, Get, HttpStatus, Post, Query, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PinoLogger } from '@novu/application-generic';
import { HumanInteractionEntity, HumanInteractionRepository } from '@novu/dal';
import { HumanInteractionKindEnum, HumanInteractionStatusEnum } from '@novu/shared';
import { Response } from 'express';
import {
  HUMAN_ACTION_PAGE_CSP,
  type HumanActionOutcome,
  renderHumanConfirmPage,
  renderHumanDonePage,
  renderHumanFailedPage,
  renderHumanLinkUsedPage,
  renderHumanTryAgainPage,
} from '../../human/email/human-action-pages';
import { resolveRelayAgentName } from '../../human/services/relay-owner-name';
import { AgentActionPreDispatchError, InboundDispatcher } from '../conversation-runtime/ingress/inbound.dispatcher';
import {
  AgentEmailActionCacheUnavailableError,
  AgentEmailActionClaims,
  AgentEmailActionTokenService,
  ConsumedActionToken,
  PeekedActionToken,
} from '../email/agent-email-action-token.service';
import { captureAgentException, captureAgentWarning } from '../shared/errors/capture-agent-sentry';
import { type HumanActionParsed, parseHumanActionId } from './human-action-id';
import { HumanRelayEmailService } from './human-relay-email.service';

/** Where a token stands: its question can still be answered, it can't, or the cache can't tell. */
type ActionLookup =
  | { state: 'open'; token: string; peeked: PeekedActionToken; outcome: HumanActionOutcome }
  | { state: 'closed'; agentName?: string }
  | { state: 'unavailable' };

/**
 * The confirmation pages of Agent Inbox emails, on agentinbox.md at `/email-action`. Every other agent keeps
 * `AgentEmailActionsController`, so nothing here reaches a Novu Connect email, and that controller's tokens get
 * no further here than the "link already used" page.
 *
 * Like that controller it works in two steps, so an email scanner that opens the link answers nothing: GET only
 * shows the question and POST sends the answer. It also looks at the question itself, so a link to a question
 * that was answered elsewhere or expired says so instead of confirming an answer nobody will receive.
 */
@Controller('/human/email-actions')
@ApiExcludeController()
export class HumanEmailActionsController {
  constructor(
    private readonly tokenService: AgentEmailActionTokenService,
    private readonly inboundDispatcher: InboundDispatcher,
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly humanRelayEmail: HumanRelayEmailService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @Get('/')
  async preview(@Query('t') token: string | undefined, @Res() res: Response): Promise<void> {
    const action = await this.lookUp(token);

    if (action.state !== 'open') {
      this.sendUnanswerable(res, action);

      return;
    }

    const { claims, mintedAt } = action.peeked;
    const { sender, recipient } = await this.humanRelayEmail.findParties({
      environmentId: claims.environmentId,
      organizationId: claims.organizationId,
      agentId: claims.agentId,
      recipientAddress: claims.userIdentifier,
    });

    this.sendHtml(
      res,
      HttpStatus.OK,
      renderHumanConfirmPage({
        sender,
        recipient,
        question: claims.agentInbox?.question || claims.label || claims.actionId,
        buttonLabel: claims.label || claims.actionId,
        danger: claims.style === 'danger',
        mintedAt,
        token: action.token,
      })
    );
  }

  @Post('/')
  async execute(@Body('t') token: string | undefined, @Res() res: Response): Promise<void> {
    const action = await this.lookUp(token);

    if (action.state !== 'open') {
      this.sendUnanswerable(res, action);

      return;
    }

    let consumed: ConsumedActionToken | null;
    try {
      consumed = await this.tokenService.consumeActionToken(action.token);
    } catch (err) {
      if (err instanceof AgentEmailActionCacheUnavailableError) {
        this.warnCacheUnavailable(err, 'consume-action-token');
        this.sendUnanswerable(res, { state: 'unavailable' });

        return;
      }

      throw err;
    }

    if (!consumed) {
      this.sendUnanswerable(res, { state: 'closed', agentName: action.peeked.claims.agentName });

      return;
    }

    const { claims } = consumed;

    try {
      await this.inboundDispatcher.processEmailAction(claims);
    } catch (err) {
      this.logger.error(err, `Failed to process Agent Inbox email action ${claims.actionId} for ${claims.agentId}`);
      captureAgentException(err, {
        component: 'human-email-actions',
        operation: 'process-email-action',
        agentId: claims.agentId,
        integrationIdentifier: claims.integrationIdentifier,
        extra: { actionId: claims.actionId, preDispatch: err instanceof AgentActionPreDispatchError },
      });

      // Same rule as `AgentEmailActionsController`: only a failure before dispatch can safely be retried.
      if (err instanceof AgentActionPreDispatchError) {
        await this.tokenService.releaseActionToken(action.token, consumed).catch((releaseErr) => {
          this.logger.warn(releaseErr, 'Failed to release Agent Inbox email action token after pre-dispatch failure');
        });
      }

      this.sendHtml(res, HttpStatus.OK, renderHumanFailedPage());

      return;
    }

    const { sender } = await this.humanRelayEmail.findParties({
      environmentId: claims.environmentId,
      organizationId: claims.organizationId,
      agentId: claims.agentId,
      recipientAddress: claims.userIdentifier,
    });

    this.sendHtml(res, HttpStatus.OK, renderHumanDonePage({ sender, outcome: action.outcome, choice: claims.label }));
  }

  /** A token of another agent's email gets no further than a used link does. */
  private async lookUp(token: string | undefined): Promise<ActionLookup> {
    if (!token) {
      return { state: 'closed' };
    }

    let peeked: PeekedActionToken | null;
    try {
      peeked = await this.tokenService.peekActionToken(token);
    } catch (err) {
      if (err instanceof AgentEmailActionCacheUnavailableError) {
        this.warnCacheUnavailable(err, 'peek-action-token');

        return { state: 'unavailable' };
      }

      throw err;
    }

    if (!peeked?.claims.agentInbox) {
      return { state: 'closed' };
    }

    const parsed = parseHumanActionId(peeked.claims.actionId);
    const interaction = await this.findInteraction(peeked.claims, parsed);

    if (parsed && !isOpen(interaction)) {
      return { state: 'closed', agentName: peeked.claims.agentName };
    }

    return { state: 'open', token, peeked, outcome: outcomeOf(parsed, interaction) };
  }

  private sendUnanswerable(res: Response, action: Exclude<ActionLookup, { state: 'open' }>): void {
    if (action.state === 'unavailable') {
      this.sendHtml(res, HttpStatus.SERVICE_UNAVAILABLE, renderHumanTryAgainPage());

      return;
    }

    const agentName = resolveRelayAgentName({ name: action.agentName ?? '' });

    this.sendHtml(res, HttpStatus.OK, renderHumanLinkUsedPage(agentName ? { agentName } : undefined));
  }

  private async findInteraction(
    claims: AgentEmailActionClaims,
    parsed: HumanActionParsed | null
  ): Promise<HumanInteractionEntity | null> {
    if (!parsed) {
      return null;
    }

    return (
      (await this.humanInteractionRepository.findByIdentifier(claims.environmentId, parsed.identifier)) ??
      (await this.humanInteractionRepository.findByRequestId(claims.environmentId, parsed.identifier))
    );
  }

  private warnCacheUnavailable(err: AgentEmailActionCacheUnavailableError, operation: string): void {
    this.logger.warn(err, 'Cache unavailable while handling an Agent Inbox email action');
    captureAgentWarning(err, { component: 'human-email-actions', operation });
  }

  private sendHtml(res: Response, status: HttpStatus, body: string): void {
    res
      .status(status)
      .setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
      .setHeader('Pragma', 'no-cache')
      .setHeader('Expires', '0')
      .setHeader('Content-Security-Policy', HUMAN_ACTION_PAGE_CSP)
      .type('text/html; charset=utf-8')
      .send(body);
  }
}

function isOpen(interaction: HumanInteractionEntity | null): boolean {
  if (interaction?.status !== HumanInteractionStatusEnum.PENDING) {
    return false;
  }

  return !interaction.expiresAt || new Date(interaction.expiresAt).getTime() > Date.now();
}

function outcomeOf(parsed: HumanActionParsed | null, interaction: HumanInteractionEntity | null): HumanActionOutcome {
  switch (parsed?.type) {
    case 'approve':
      return 'approved';
    case 'deny':
      return 'denied';
    case 'option':
      return interaction?.kind === HumanInteractionKindEnum.APPROVE ? 'approved' : 'picked';
    default:
      return 'answered';
  }
}
