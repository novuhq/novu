import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { decryptCredentials, InstrumentUsecase } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { HumanChannelViaEnum } from '@novu/shared';
import { hasWhatsAppSendCredentials } from '../../../integrations/usecases/whatsapp/whatsapp-credentials.utils';
import type { HumanWhatsAppFirstMessageDto } from '../../dtos/human-whatsapp.dto';
import { HumanChannelGate } from '../../services/human-channel-gate.service';
import { firstMessageProblem } from '../../services/whatsapp-first-message';
import { FirstMessageSubmitError, WhatsAppFirstMessageService } from '../../services/whatsapp-first-message.service';
import { findRelayWhatsAppIntegration } from './relay-whatsapp-integration';

export type SubmitHumanWhatsAppFirstMessageParams = {
  environmentId: string;
  organizationId: string;
  agentIdentifier: string;
  body: string;
};

/**
 * Sends the operator's first message to Meta for review, as a template on their own WhatsApp Business account. Once
 * Meta approves it, an agent can reach someone whose 24-hour window has closed: they get this message, and what the
 * agent sent follows when they reply.
 */
@Injectable()
export class SubmitHumanWhatsAppFirstMessage {
  constructor(
    private readonly channelGate: HumanChannelGate,
    private readonly firstMessage: WhatsAppFirstMessageService,
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  @InstrumentUsecase()
  async execute(params: SubmitHumanWhatsAppFirstMessageParams): Promise<HumanWhatsAppFirstMessageDto> {
    await this.channelGate.assertViaEnabled(HumanChannelViaEnum.WHATSAPP, params);

    const body = params.body.trim();
    const problem = firstMessageProblem(body);
    if (problem) {
      throw new BadRequestException({ code: 'first_message_invalid', message: problem });
    }

    const { agent, integration } = await findRelayWhatsAppIntegration(
      {
        agentRepository: this.agentRepository,
        agentIntegrationRepository: this.agentIntegrationRepository,
        integrationRepository: this.integrationRepository,
      },
      params
    );
    if (!agent) {
      throw new NotFoundException({ code: 'agent_not_found', message: 'Run `human setup` first.' });
    }

    if (!integration || !hasWhatsAppSendCredentials(decryptCredentials(integration.credentials ?? {}))) {
      throw new ConflictException({
        code: 'channel_not_found',
        message: 'Connect your WhatsApp Business account first.',
      });
    }

    try {
      return toFirstMessageDto(await this.firstMessage.submit(integration, body));
    } catch (error) {
      if (error instanceof FirstMessageSubmitError) {
        throw new BadRequestException({ code: 'first_message_refused', message: describeRefusal(error) });
      }

      throw error;
    }
  }
}

export function toFirstMessageDto(state: {
  status: string;
  body: string;
  rejectedReason?: string;
  approved?: { body: string };
}): HumanWhatsAppFirstMessageDto {
  return {
    status: state.status,
    body: state.body,
    ...(state.rejectedReason ? { rejectedReason: state.rejectedReason } : {}),
    approved: Boolean(state.approved),
    ...(state.approved && state.approved.body !== state.body ? { approvedBody: state.approved.body } : {}),
  };
}

/** Meta's words, except where its code says what to do about it. */
function describeRefusal(error: FirstMessageSubmitError): string {
  const { code } = error.meta;
  if (code === 190 || code === 463) {
    return 'WhatsApp needs you to connect your business account again before Meta takes a message.';
  }

  if (code === 200 || code === 10) {
    return "Agent Inbox isn't allowed to add messages to this WhatsApp Business account. Connect it again and allow managing it.";
  }

  return `Meta didn't take the message: ${error.meta.message}`;
}
