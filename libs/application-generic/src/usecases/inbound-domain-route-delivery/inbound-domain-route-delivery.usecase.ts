import { BadRequestException, Injectable } from '@nestjs/common';
import { AgentIntegrationRepository, DomainEntity, DomainRouteEntity, IntegrationRepository } from '@novu/dal';
import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  EmailWebhookPayload,
  InboundEmailAttachment,
  WebhookEventEnum,
  WebhookObjectTypeEnum,
} from '@novu/shared';
import { IFrom, IHeaders, IInboundParseAttachment, ITo } from '../../dtos/inbound-parse-job.dto';
import { decryptSecret } from '../../encryption/encrypt-provider';
import { PinoLogger } from '../../logging';
import { HttpClientService } from '../../services/http-client/http-client.service';
import { buildNovuSignatureHeader } from '../../utils/hmac';
import { normalizeReferences } from '../../utils/inbound-email-references';
import { SendWebhookMessage } from '../../webhooks/usecases/send-webhook-message/send-webhook-message.usecase';
import { AttachmentRehydrator } from './attachment-rehydrator';

export interface RoutableDomain
  extends Pick<
    DomainEntity,
    '_id' | 'name' | 'status' | 'mxRecordConfigured' | '_environmentId' | '_organizationId' | 'data'
  > {}

export interface InboundDomainRouteMailInput {
  from: IFrom[];
  to: ITo[];
  subject: string;
  html: string;
  text: string;
  headers: IHeaders;
  attachments?: IInboundParseAttachment[];
  messageId: string;
  inReplyTo?: string;
  references?: string | string[];
  date: Date;
  cc?: unknown[];
}

export interface DomainRouteWebhookPayload {
  domain: {
    id: string;
    name: string;
    data: Record<string, string>;
  };
  route: {
    address: string;
    data: Record<string, string>;
  };
  mail: {
    from: InboundDomainRouteMailInput['from'];
    to: InboundDomainRouteMailInput['to'];
    subject: string;
    html: string;
    text: string;
    headers: InboundDomainRouteMailInput['headers'];
    /** Rehydrated attachments — include both new `url`/`size` and the deprecated legacy `content` field. */
    attachments?: InboundEmailAttachment[];
    messageId: string;
    inReplyTo?: string;
    references?: string | string[];
    date: Date;
    cc?: unknown[];
  };
}

@Injectable()
export class InboundDomainRouteDelivery {
  constructor(
    private readonly sendWebhookMessage: SendWebhookMessage,
    private readonly httpClientService: HttpClientService,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly attachmentRehydrator: AttachmentRehydrator,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  buildDomainRouteWebhookPayload(
    domain: RoutableDomain,
    route: DomainRouteEntity,
    mail: InboundDomainRouteMailInput,
    rehydratedAttachments: InboundEmailAttachment[]
  ): DomainRouteWebhookPayload {
    return {
      domain: {
        id: domain._id,
        name: domain.name,
        data: domain.data ?? {},
      },
      route: {
        address: route.address,
        data: route.data ?? {},
      },
      mail: {
        from: mail.from,
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        headers: mail.headers,
        attachments: rehydratedAttachments,
        messageId: mail.messageId,
        inReplyTo: mail.inReplyTo,
        references: mail.references,
        date: mail.date,
        cc: mail.cc,
      },
    };
  }

  async deliverToWebhook(params: {
    environmentId: string;
    organizationId: string;
    domain: RoutableDomain;
    route: DomainRouteEntity;
    mail: InboundDomainRouteMailInput;
  }): Promise<{ latencyMs: number; skipped: boolean }> {
    const started = Date.now();
    const rehydratedAttachments = await this.attachmentRehydrator.rehydrate(params.mail.attachments);
    const payload = this.buildDomainRouteWebhookPayload(
      params.domain,
      params.route,
      params.mail,
      rehydratedAttachments
    );
    const result = await this.sendWebhookMessage.execute({
      environmentId: params.environmentId,
      organizationId: params.organizationId,
      eventType: WebhookEventEnum.EMAIL_RECEIVED,
      objectType: WebhookObjectTypeEnum.EMAIL_INBOUND,
      payload: { object: payload as unknown as Record<string, unknown> },
    });

    return {
      latencyMs: Date.now() - started,
      skipped: result === undefined,
    };
  }

  async deliverToAgent(params: {
    domain: RoutableDomain;
    route: DomainRouteEntity;
    mail: InboundDomainRouteMailInput;
    toAddress: string;
  }): Promise<{ httpStatus: number; body: unknown; latencyMs: number }> {
    this.logger.info({ toAddress: params.toAddress }, 'Delivering inbound email to agent');

    const started = Date.now();
    const agentId = params.route.destination;

    if (!agentId) {
      this.throwError(`Agent route for ${params.toAddress} has no destination`);
    }

    const { identifier: integrationIdentifier, secretKey } = await this.resolveIntegration(
      agentId,
      params.domain._environmentId,
      params.domain._organizationId
    );

    const payload = this.buildAgentEmailWebhookPayload(params.mail);
    const signature = buildNovuSignatureHeader(secretKey, payload);
    const apiBaseUrl = process.env.API_ROOT_URL;

    if (!apiBaseUrl) {
      this.throwError('API_ROOT_URL environment variable is not set — cannot forward inbound email to agent webhook');
    }

    const url = `${apiBaseUrl}/v1/agents/${encodeURIComponent(agentId)}/webhook/${encodeURIComponent(integrationIdentifier)}`;

    const response = await this.httpClientService.request<unknown>({
      url,
      method: 'POST',
      body: payload,
      headers: { 'novu-signature': signature, 'content-type': 'application/json' },
      timeout: 30_000,
    });

    return {
      httpStatus: response.statusCode,
      body: response.body,
      latencyMs: Date.now() - started,
    };
  }

  previewAgentMailPayload(mail: InboundDomainRouteMailInput): EmailWebhookPayload {
    return this.buildAgentEmailWebhookPayload(mail);
  }

  private buildAgentEmailWebhookPayload(mail: InboundDomainRouteMailInput): EmailWebhookPayload {
    const from = mail.from[0];
    const refs = normalizeReferences(mail.references);

    return {
      messageId: mail.messageId,
      inReplyTo: mail.inReplyTo ?? undefined,
      references: refs.length > 0 ? refs.join(' ') : undefined,
      from: { address: from.address, name: from.name },
      to: mail.to.map((t: { address: string; name?: string }) => ({
        address: t.address,
        name: t.name,
      })),
      subject: mail.subject,
      text: mail.text || undefined,
      html: mail.html || undefined,
      attachments: mail.attachments?.map((att) => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.size,
        url: att.url,
      })),
      date: (() => {
        const d = new Date(mail.date as unknown as string);

        return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      })(),
    };
  }

  private async resolveIntegration(
    agentId: string,
    environmentId: string,
    organizationId: string
  ): Promise<{ identifier: string; secretKey: string }> {
    const links = await this.agentIntegrationRepository.findLinksForAgents({
      organizationId,
      environmentId,
      agentIds: [agentId],
    });

    const integrationIds = links.map((l) => l._integrationId).filter(Boolean);

    if (integrationIds.length === 0) {
      this.throwError(`No integration linked to agent ${agentId}`);
    }

    const integration = await this.integrationRepository.findOne(
      {
        _id: { $in: integrationIds } as unknown as string,
        _environmentId: environmentId,
        _organizationId: organizationId,
        providerId: EmailProviderIdEnum.NovuAgent,
        channel: ChannelTypeEnum.EMAIL,
        active: true,
      },
      'identifier credentials active'
    );

    if (!integration) {
      this.throwError(`No active NovuAgent email integration found for agent ${agentId}`);
    }

    const encryptedSecret = integration.credentials?.secretKey;

    if (!encryptedSecret) {
      this.throwError(
        `Integration ${integration.identifier} is missing its webhook secret — re-link the email integration to regenerate it`
      );
    }

    return { identifier: integration.identifier, secretKey: decryptSecret(encryptedSecret) };
  }

  private throwError(error: string): never {
    this.logger.error({ err: error }, 'Error delivering inbound email to agent');
    throw new BadRequestException(error);
  }
}
