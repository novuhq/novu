import { Injectable } from '@nestjs/common';
import { decryptCredentials, InstrumentUsecase } from '@novu/application-generic';
import { AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum, type WhatsAppSignupLinkStatus } from '@novu/shared';

import {
  InvalidWhatsAppSignupLinkTokenError,
  WhatsAppSignupLinkTokenService,
} from '../../whatsapp-signup-link-token.service';
import { GetWhatsAppSignupLinkStatusCommand } from './get-whatsapp-signup-link-status.command';
import { hasWhatsAppSendCredentials } from './whatsapp-credentials.utils';

export type GetWhatsAppSignupLinkStatusResult = WhatsAppSignupLinkStatus;

/**
 * Secret-free signup progress for the public tokenized WhatsApp signup flow.
 * Answers both the signup page (is this link usable, which agent is it for)
 * and the connect CLI's completion polling (`credentialsSaved` + the public
 * business phone number for wa.me test deep links). Tokens consumed by a
 * successful completion still resolve here for the rest of their TTL, so the
 * CLI can observe `credentialsSaved: true` after the page finishes.
 */
@Injectable()
export class GetWhatsAppSignupLinkStatus {
  constructor(
    private readonly tokenService: WhatsAppSignupLinkTokenService,
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: GetWhatsAppSignupLinkStatusCommand): Promise<GetWhatsAppSignupLinkStatusResult> {
    let peeked: Awaited<ReturnType<WhatsAppSignupLinkTokenService['peek']>>;
    try {
      peeked = await this.tokenService.peek(command.token);
    } catch (err) {
      if (err instanceof InvalidWhatsAppSignupLinkTokenError) {
        return { valid: false, reason: err.reason === 'expired' ? 'expired' : 'invalid' };
      }

      throw err;
    }

    const { payload } = peeked;

    const integration = await this.integrationRepository.findOne({
      _environmentId: payload.env,
      _organizationId: payload.org,
      identifier: payload.iid,
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
    });

    if (!integration) {
      return { valid: false, reason: 'invalid' };
    }

    const agent = await this.agentRepository.findOne(
      {
        identifier: payload.aid,
        _environmentId: payload.env,
        _organizationId: payload.org,
      },
      ['name']
    );

    if (!agent) {
      return { valid: false, reason: 'invalid' };
    }

    const credentials = integration.credentials ? decryptCredentials(integration.credentials) : undefined;

    if (!credentials || !hasWhatsAppSendCredentials(credentials)) {
      return { valid: true, agentName: agent.name, credentialsSaved: false };
    }

    const displayPhoneNumber = typeof credentials.from === 'string' ? credentials.from.trim() : '';

    return {
      valid: true,
      agentName: agent.name,
      credentialsSaved: true,
      ...(displayPhoneNumber ? { displayPhoneNumber } : {}),
    };
  }
}
