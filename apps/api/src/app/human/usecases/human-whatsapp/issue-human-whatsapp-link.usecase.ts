import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { decryptCredentials, InstrumentUsecase } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { HumanChannelViaEnum } from '@novu/shared';
import { WhatsAppBindCodeService } from '../../../agents/human-relay/whatsapp-bind-code.service';
import { normalizePhoneForMeta } from '../../../agents/shared/util/phone-normalization';
import { hasWhatsAppSendCredentials } from '../../../integrations/usecases/whatsapp/whatsapp-credentials.utils';
import { HumanChannelGate } from '../../services/human-channel-gate.service';
import { findRelayWhatsAppIntegration } from './relay-whatsapp-integration';

export type IssueHumanWhatsAppLinkParams = {
  environmentId: string;
  organizationId: string;
  agentIdentifier: string;
  /** The contact whose number the code binds. */
  subscriberId: string;
  /** The relay's WhatsApp channel to bind on. Without it, its active one. */
  integrationIdentifier?: string;
};

export type HumanWhatsAppLink = {
  /** `https://wa.me/<business number>?text=<the code>`: opens WhatsApp with the message ready to send. */
  url: string;
  /** The code as the message carries it, `BCDF-GHJK`, for typing by hand. */
  code: string;
  expiresAt: string;
};

/**
 * A wa.me link to the relay's WhatsApp Business number with a one-time code pre-filled, the WhatsApp answer to
 * Telegram's `t.me/<bot>?start=<code>`. Sending it proves the number is the contact's and binds it.
 */
@Injectable()
export class IssueHumanWhatsAppLink {
  constructor(
    private readonly channelGate: HumanChannelGate,
    private readonly codes: WhatsAppBindCodeService,
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  @InstrumentUsecase()
  async execute(params: IssueHumanWhatsAppLinkParams): Promise<HumanWhatsAppLink> {
    await this.channelGate.assertViaEnabled(HumanChannelViaEnum.WHATSAPP, params);

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

    if (!integration) {
      throw new NotFoundException({ code: 'channel_not_found', message: 'Connect a WhatsApp Business number first.' });
    }

    const credentials = decryptCredentials(integration.credentials ?? {});
    const businessNumber =
      hasWhatsAppSendCredentials(credentials) && typeof credentials.from === 'string'
        ? normalizePhoneForMeta(credentials.from)
        : '';
    if (!businessNumber) {
      throw new ConflictException({
        code: 'whatsapp_number_unknown',
        message: 'WhatsApp didn’t say which number is connected. Connect WhatsApp again.',
      });
    }

    const { code, expiresAt } = await this.codes.issue({
      environmentId: params.environmentId,
      organizationId: params.organizationId,
      integrationId: String(integration._id),
      agentIdentifier: agent.identifier,
      subscriberId: params.subscriberId,
    });
    const text = `Connect my WhatsApp: ${code}`;

    return { url: `https://wa.me/${businessNumber}?text=${encodeURIComponent(text)}`, code, expiresAt };
  }
}
