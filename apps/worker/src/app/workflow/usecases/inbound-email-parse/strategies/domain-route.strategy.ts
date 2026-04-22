import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  buildNovuSignatureHeader,
  GetDecryptedSecretKey,
  GetDecryptedSecretKeyCommand,
  HttpClientService,
  SendWebhookMessage,
} from '@novu/application-generic';
import { AgentIntegrationRepository, DomainEntity, DomainRepository, DomainRoute, IntegrationRepository } from '@novu/dal';
import {
  DomainRouteTypeEnum,
  DomainStatusEnum,
  EmailWebhookPayload,
  WebhookEventEnum,
  WebhookObjectTypeEnum,
} from '@novu/shared';
import { InboundEmailParseCommand } from '../inbound-email-parse.command';
import { normalizeReferences } from './resolve-thread-id';

type RoutableDomain = Pick<
  DomainEntity,
  '_id' | 'name' | 'status' | 'mxRecordConfigured' | 'routes' | '_environmentId' | '_organizationId'
>;

const LOG_CONTEXT = 'DomainRouteStrategy';

export type DomainRouteEmailPayload = {
  domain: {
    id: string;
    name: string;
  };
  route: {
    address: string;
  };
  mail: {
    from: InboundEmailParseCommand['from'];
    to: InboundEmailParseCommand['to'];
    subject: InboundEmailParseCommand['subject'];
    html: InboundEmailParseCommand['html'];
    text: InboundEmailParseCommand['text'];
    headers: InboundEmailParseCommand['headers'];
    attachments: InboundEmailParseCommand['attachments'];
    messageId: InboundEmailParseCommand['messageId'];
    inReplyTo: InboundEmailParseCommand['inReplyTo'];
    references: InboundEmailParseCommand['references'];
    date: InboundEmailParseCommand['date'];
    cc: InboundEmailParseCommand['cc'];
  };
};

@Injectable()
export class DomainRouteStrategy {
  constructor(
    private domainRepository: DomainRepository,
    private sendWebhookMessage: SendWebhookMessage,
    private httpClientService: HttpClientService,
    private getDecryptedSecretKey: GetDecryptedSecretKey,
    private integrationRepository: IntegrationRepository,
    private agentIntegrationRepository: AgentIntegrationRepository
  ) {}

  async execute(command: InboundEmailParseCommand): Promise<void> {
    const toAddress = command.to[0].address;

    Logger.log({ toAddress }, 'Processing domain-route email', LOG_CONTEXT);

    const domain = await this.domainRepository.findByRouteAddress(toAddress);

    if (!domain) {
      this.throwError(`No domain found for address ${toAddress}`);
    }

    if (domain.status !== DomainStatusEnum.VERIFIED) {
      this.throwError(`Domain ${domain.name} is not verified`);
    }

    if (!domain.mxRecordConfigured) {
      this.throwError(`Domain ${domain.name} does not have MX records configured`);
    }

    const localPart = toAddress.split('@')[0];
    const matchByType = (type: DomainRouteTypeEnum) =>
      domain.routes.find((r) => r.type === type && r.address === localPart) ??
      domain.routes.find((r) => r.type === type && r.address === '*');

    const webhookRoute = matchByType(DomainRouteTypeEnum.WEBHOOK);
    const agentRoute = matchByType(DomainRouteTypeEnum.AGENT);

    if (webhookRoute) {
      await this.fireWebhookEvent(command, domain, webhookRoute);
    }

    if (agentRoute) {
      await this.handleAgentRoute(command, domain, agentRoute, toAddress);
    }
  }

  private async fireWebhookEvent(
    command: InboundEmailParseCommand,
    domain: RoutableDomain,
    route: DomainRoute
  ): Promise<void> {
    const payload: DomainRouteEmailPayload = {
      domain: {
        id: domain._id,
        name: domain.name,
      },
      route: { address: route.address },
      mail: {
        from: command.from,
        to: command.to,
        subject: command.subject,
        html: command.html,
        text: command.text,
        headers: command.headers,
        attachments: command.attachments,
        messageId: command.messageId,
        inReplyTo: command.inReplyTo,
        references: command.references,
        date: command.date,
        cc: command.cc,
      },
    };

    await this.sendWebhookMessage.execute({
      environmentId: domain._environmentId,
      organizationId: domain._organizationId,
      eventType: WebhookEventEnum.EMAIL_RECEIVED,
      objectType: WebhookObjectTypeEnum.EMAIL_INBOUND,
      payload: { object: payload as unknown as Record<string, unknown> },
    });

    Logger.log(
      { toAddress: command.to[0].address, domain: domain.name },
      'Fired email.received webhook event',
      LOG_CONTEXT
    );
  }

  private async handleAgentRoute(
    command: InboundEmailParseCommand,
    domain: RoutableDomain,
    route: DomainRoute,
    toAddress: string
  ): Promise<void> {
    const agentId = route.destination;
    if (!agentId) {
      this.throwError(`Agent route for ${toAddress} has no destination`);
    }

    const integrationIdentifier = await this.resolveIntegrationIdentifier(
      agentId,
      domain._environmentId,
      domain._organizationId
    );

    const payload = this.buildWebhookPayload(command);

    const secretKey = await this.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({ environmentId: domain._environmentId })
    );

    const signature = buildNovuSignatureHeader(secretKey, payload);
    const apiBaseUrl = process.env.API_ROOT_URL || 'http://localhost:3000';
    const url = `${apiBaseUrl}/v1/agents/${agentId}/webhook/${integrationIdentifier}`;

    await this.httpClientService.request({
      url,
      method: 'POST',
      body: payload,
      headers: { 'novu-signature': signature, 'content-type': 'application/json' },
      timeout: 30_000,
    });

    Logger.log(
      { toAddress, agentId, integrationIdentifier },
      'Forwarded inbound email to agent webhook',
      LOG_CONTEXT
    );
  }

  private async resolveIntegrationIdentifier(
    agentId: string,
    environmentId: string,
    organizationId: string
  ): Promise<string> {
    const links = await this.agentIntegrationRepository.findLinksForAgents({
      organizationId,
      environmentId,
      agentIds: [agentId],
    });

    if (links.length === 0) {
      this.throwError(`No integration linked to agent ${agentId}`);
    }

    const integration = await this.integrationRepository.findOne(
      { _id: links[0]._integrationId, _environmentId: environmentId },
      'identifier'
    );
    if (!integration) {
      this.throwError(`Integration ${links[0]._integrationId} not found for agent ${agentId}`);
    }

    return integration.identifier;
  }

  private buildWebhookPayload(command: InboundEmailParseCommand): EmailWebhookPayload {
    const from = command.from[0];
    const refs = normalizeReferences(command.references);

    return {
      messageId: command.messageId,
      inReplyTo: command.inReplyTo ?? undefined,
      references: refs.length > 0 ? refs.join(' ') : undefined,
      from: { address: from.address, name: from.name },
      to: command.to.map((t: { address: string; name?: string }) => ({
        address: t.address,
        name: t.name,
      })),
      subject: command.subject,
      text: command.text || undefined,
      html: command.html || undefined,
      attachments: command.attachments?.map((a: { filename: string; contentType: string; url?: string }) => ({
        filename: a.filename,
        contentType: a.contentType,
        url: a.url,
      })),
      date: command.date instanceof Date ? command.date.toISOString() : new Date().toISOString(),
    };
  }

  private throwError(error: string): never {
    Logger.error(error, LOG_CONTEXT);
    throw new BadRequestException(error);
  }
}
