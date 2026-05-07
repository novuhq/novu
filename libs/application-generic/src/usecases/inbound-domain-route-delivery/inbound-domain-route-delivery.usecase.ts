import { BadRequestException, Injectable } from '@nestjs/common';
import { AgentIntegrationRepository, DomainEntity, DomainRouteEntity, IntegrationRepository } from '@novu/dal';
import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  EmailWebhookPayload,
  WebhookEventEnum,
  WebhookObjectTypeEnum,
} from '@novu/shared';
import { IFrom, IHeaders, ITo } from '../../dtos/inbound-parse-job.dto';
import { decryptSecret } from '../../encryption/encrypt-provider';
import { PinoLogger } from '../../logging';
import { HttpClientService } from '../../services/http-client/http-client.service';
import { buildNovuSignatureHeader } from '../../utils/hmac';
import { normalizeReferences } from '../../utils/inbound-email-references';
import { SendWebhookMessage } from '../../webhooks/usecases/send-webhook-message/send-webhook-message.usecase';

export type RoutableDomain = Pick<
  DomainEntity,
  '_id' | 'name' | 'status' | 'mxRecordConfigured' | '_environmentId' | '_organizationId' | 'data'
>;

export type InboundDomainRouteMailInput = {
  from: IFrom[];
  to: ITo[];
  subject: string;
  html: string;
  text: string;
  headers: IHeaders;
  attachments?: unknown[];
  messageId: string;
  inReplyTo?: string;
  references?: string | string[];
  date: Date;
  cc?: unknown[];
};

export type DomainRouteWebhookPayload = {
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
    attachments?: InboundDomainRouteMailInput['attachments'];
    messageId: string;
    inReplyTo?: string;
    references?: string | string[];
    date: Date;
    cc?: unknown[];
  };
};

@Injectable()
export class InboundDomainRouteDelivery {
  constructor(
    private readonly sendWebhookMessage: SendWebhookMessage,
    private readonly httpClientService: HttpClientService,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  buildDomainRouteWebhookPayload(
    domain: RoutableDomain,
    route: DomainRouteEntity,
    mail: InboundDomainRouteMailInput
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
        attachments: mail.attachments,
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
    const payload = this.buildDomainRouteWebhookPayload(params.domain, params.route, params.mail);
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

    this.logger.info(
      { toAddress: params.toAddress, agentId, integrationIdentifier, url },
      'Forwarded inbound email to agent webhook'
    );

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
    const attachments = this.mapAttachmentsForWebhook(mail.attachments);

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
      attachments,
      date: (() => {
        const d = new Date(mail.date as unknown as string);

        return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      })(),
    };
  }

  /**
   * Reconstruct a Buffer from either a real Buffer instance or the
   * `{ type: 'Buffer', data: number[] }` shape that BullMQ produces when it
   * round-trips a Buffer through JSON serialization. Returns null when neither
   * shape is present.
   */
  private coerceToBuffer(value: unknown): Buffer | null {
    if (Buffer.isBuffer(value)) {
      return value;
    }

    if (
      value !== null &&
      typeof value === 'object' &&
      (value as { type?: unknown }).type === 'Buffer' &&
      Array.isArray((value as { data?: unknown }).data)
    ) {
      return Buffer.from((value as { data: number[] }).data);
    }

    return null;
  }

  /**
   * Convert raw mailparser attachments to the NovuEmailAttachment shape.
   *
   * Mailparser 0.6 stores parsed bytes in `attachment.content` (a Buffer).
   * BullMQ JSON-serializes the inbound parse job, so on the worker consumer
   * side the field arrives as `{ type: 'Buffer', data: number[] }` rather than
   * a real Buffer instance. coerceToBuffer handles both shapes.
   *
   * We base64-encode inline bytes up to per-attachment (5 MB) and aggregate
   * (5 MB) caps to stay under the /v1/agents 8 MB body-parser limit. Attachments
   * that exceed a cap are included with metadata only and `truncated: true` so
   * downstream consumers can still render a placeholder.
   */
  private mapAttachmentsForWebhook(
    rawAttachments: unknown[] | undefined
  ): import('@novu/shared').NovuEmailAttachment[] | undefined {
    if (!rawAttachments?.length) {
      return undefined;
    }

    const PER_ATTACHMENT_CAP = 5 * 1024 * 1024;
    const AGGREGATE_CAP = 5 * 1024 * 1024;

    let aggregateBytes = 0;
    let inlinedCount = 0;
    let truncatedCount = 0;

    const result = rawAttachments.map((a) => {
      const att = a as {
        fileName?: string;
        filename?: string;
        generatedFileName?: string;
        contentType?: string;
        length?: number;
        content?: unknown;
        url?: string;
      };

      const filename = att.fileName ?? att.generatedFileName ?? att.filename ?? 'attachment';
      const contentType = att.contentType ?? 'application/octet-stream';
      const buffer = this.coerceToBuffer(att.content);

      if (!buffer) {
        truncatedCount += 1;

        return {
          filename,
          contentType,
          ...(typeof att.length === 'number' ? { size: att.length } : {}),
          truncated: true as const,
        };
      }

      const size = buffer.length;

      if (size > PER_ATTACHMENT_CAP) {
        truncatedCount += 1;
        this.logger.warn(
          { filename, size, cap: PER_ATTACHMENT_CAP },
          'Inbound attachment exceeds per-attachment cap; omitting bytes from webhook payload'
        );

        return { filename, contentType, size, truncated: true as const };
      }

      if (aggregateBytes + size > AGGREGATE_CAP) {
        truncatedCount += 1;
        this.logger.warn(
          { filename, size, aggregateBytes, cap: AGGREGATE_CAP },
          'Inbound attachment would exceed aggregate cap; omitting bytes from webhook payload'
        );

        return { filename, contentType, size, truncated: true as const };
      }

      aggregateBytes += size;
      inlinedCount += 1;

      return {
        filename,
        contentType,
        size,
        contentBase64: buffer.toString('base64'),
      };
    });

    this.logger.info(
      { count: rawAttachments.length, inlinedCount, truncatedCount, aggregateBytes },
      'Mapped inbound attachments for agent webhook'
    );

    return result;
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
      },
      'identifier credentials'
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
