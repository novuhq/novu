import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SendWebhookMessage } from '@novu/application-generic';
import { DomainEntity, DomainRepository, DomainRoute } from '@novu/dal';
import { DomainRouteTypeEnum, DomainStatusEnum, WebhookEventEnum, WebhookObjectTypeEnum } from '@novu/shared';
import { InboundEmailParseCommand } from '../inbound-email-parse.command';
import { normalizeReferences, resolveThreadId } from './resolve-thread-id';

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
    private sendWebhookMessage: SendWebhookMessage
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
    _domain: RoutableDomain,
    route: DomainRoute,
    toAddress: string
  ): Promise<void> {
    const threadInfo = {
      threadId: resolveThreadId(toAddress, command.messageId, command.inReplyTo, command.references),
      messageId: command.messageId,
      inReplyTo: command.inReplyTo ?? null,
      references: normalizeReferences(command.references),
      subject: command.subject,
      isReply: !!command.inReplyTo,
    };

    // TODO: Implement agent request in next step
    // await this.sendToAgent(route.destination, _agentPayload, threadInfo);
    Logger.log(
      { toAddress, destination: route.destination, threadInfo },
      'Agent route — thread info collected, forwarding not yet implemented',
      LOG_CONTEXT
    );
  }

  private throwError(error: string): never {
    Logger.error(error, LOG_CONTEXT);
    throw new BadRequestException(error);
  }
}
