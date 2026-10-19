import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';
import { AgentEmailInboxQuotaService, MailFactory, PinoLogger } from '@novu/application-generic';
import { AgentRepository, SubscriberRepository } from '@novu/dal';
import type { IEmailOptions } from '@novu/shared';

import type { ResolvedAgentOutboundEmail } from '../../agents/email/resolve-agent-outbound-email';
import { isKeylessOrganization } from '../../keyless/keyless-organization.helpers';
import { resolveHumanDashboardBaseUrl } from '../../shared/helpers/resolve-human-dashboard-base-url';
import { HumanOperatorService } from '../services/human-operator.service';
import { buildRelayOwnerName, resolveRelaySender } from '../services/relay-owner-name';
import { buildHumanVerificationEmail } from './human-verification-email.template';

/**
 * Sends the Human double-opt-in verification email through the relay agent's
 * own outbound email integration. Bypasses OutboundGateway so there is no
 * "Powered by Novu" watermark — this mail is Human-branded only.
 */
@Injectable()
export class HumanVerificationEmailSender {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly operatorService: HumanOperatorService,
    private readonly inboxQuota: AgentEmailInboxQuotaService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async send(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    subscriberId: string;
    address: string;
    token: string;
    code: string;
    expiresAt: string;
    outbound: ResolvedAgentOutboundEmail;
    /** Keyless setups only: the operator can claim the setup from the same email. */
    claimUrl?: string;
  }): Promise<void> {
    const agent = await this.agentRepository.findOne(
      {
        _id: params.agentId,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
      },
      '*'
    );

    if (!agent) {
      throw new NotFoundException('Relay agent not found.');
    }

    const operatorId = await this.operatorService.findForAgent({
      environmentId: params.environmentId,
      organizationId: params.organizationId,
      agentId: params.agentId,
    });
    const [subscriber, operator] = await Promise.all([
      this.subscriberRepository.findOne({
        subscriberId: params.subscriberId,
        _environmentId: params.environmentId,
      }),
      operatorId
        ? this.subscriberRepository.findOne(
            { subscriberId: operatorId, _environmentId: params.environmentId },
            'firstName lastName'
          )
        : Promise.resolve(null),
    ]);
    const sender = resolveRelaySender({ agent, operator });
    const inviteeName = buildRelayOwnerName(subscriber?.firstName, subscriber?.lastName);

    const { senderIntegration, from, senderName } = params.outbound;

    const verifyUrl = buildVerifyUrl(params.token);
    const content = buildHumanVerificationEmail({
      sender,
      inviteeName,
      verifyUrl,
      code: params.code,
      expiresAt: params.expiresAt,
      claimUrl: params.claimUrl,
    });

    const mailFactory = new MailFactory();
    const handler = mailFactory.getHandler(senderIntegration, from);
    const mailOptions: IEmailOptions = {
      to: [params.address],
      subject: content.subject,
      html: content.html,
      text: content.text,
      from,
      senderName,
    };

    // Same choke point as every other Agent Email Inbox send: the credit is
    // consumed only once the provider accepts the message. Keyless orgs share
    // one organization id, so they stay on the per-address verification cap.
    const attempt = isKeylessOrganization(params.organizationId)
      ? undefined
      : await this.inboxQuota.beginSend(params.organizationId);

    try {
      await handler.send(mailOptions);
      attempt?.accept();
    } catch (err) {
      await attempt?.release();

      const base = err instanceof Error ? err.message : String(err);
      const body = (err as { response?: { body?: { errors?: Array<{ message?: string }>; message?: string } } })
        ?.response?.body;
      const detail = Array.isArray(body?.errors) ? body.errors[0]?.message : body?.message;
      this.logger.warn({ err, address: params.address, agentId: params.agentId }, 'Failed to send verification email');

      throw new BadGatewayException({
        error: 'delivery_failed',
        message: detail ? `${base}: ${detail}` : base,
      });
    }
  }
}

function buildVerifyUrl(token: string): string {
  const url = `${resolveHumanDashboardBaseUrl()}/verify/${token}`;

  return process.env.NOVU_REGION?.startsWith('eu-') ? `${url}?region=eu` : url;
}
