import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InboundDomainRouteDelivery } from '@novu/application-generic';
import { DomainRepository, DomainRouteRepository } from '@novu/dal';
import { DomainRouteTypeEnum, DomainStatusEnum } from '@novu/shared';
import { InboundEmailParseCommand } from '../inbound-email-parse.command';

const LOG_CONTEXT = 'DomainRouteStrategy';

@Injectable()
export class DomainRouteStrategy {
  constructor(
    private domainRepository: DomainRepository,
    private domainRouteRepository: DomainRouteRepository,
    private inboundDomainRouteDelivery: InboundDomainRouteDelivery
  ) {}

  async execute(command: InboundEmailParseCommand): Promise<void> {
    const toAddress = command.to[0].address;

    Logger.log({ toAddress }, 'Processing domain-route email', LOG_CONTEXT);

    const [rawLocalPart, rawDomainName] = toAddress.split('@');
    const localPart = rawLocalPart?.toLowerCase();
    const domainName = rawDomainName?.toLowerCase();

    if (!domainName) {
      this.throwError(`No domain found for address ${toAddress}`);
    }

    const domain = await this.domainRepository.findByName(domainName);

    if (!domain) {
      this.throwError(`No domain found for address ${toAddress}`);
    }

    if (domain.status !== DomainStatusEnum.VERIFIED) {
      this.throwError(`Domain ${domain.name} is not verified`);
    }

    if (!domain.mxRecordConfigured) {
      this.throwError(`Domain ${domain.name} does not have MX records configured`);
    }

    const routes = await this.domainRouteRepository.findByDomainAndAddresses({
      domainId: domain._id,
      environmentId: domain._environmentId,
      organizationId: domain._organizationId,
      addresses: [localPart, '*'],
    });
    const route = routes.find((r) => r.address === localPart) ?? routes.find((r) => r.address === '*');

    if (!route) {
      Logger.log({ toAddress, domain: domain.name }, 'No route matched the inbound email', LOG_CONTEXT);

      return;
    }

    const mail = this.commandToMail(command);

    if (route.type === DomainRouteTypeEnum.WEBHOOK) {
      await this.inboundDomainRouteDelivery.deliverToWebhook({
        environmentId: domain._environmentId,
        organizationId: domain._organizationId,
        domain,
        route,
        mail,
      });

      Logger.log({ toAddress, domain: domain.name }, 'Fired email.received webhook event', LOG_CONTEXT);

      return;
    }

    if (route.type === DomainRouteTypeEnum.AGENT) {
      await this.inboundDomainRouteDelivery.deliverToAgent({
        domain,
        route,
        mail,
        toAddress,
      });
    }
  }

  private commandToMail(command: InboundEmailParseCommand) {
    return {
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
    };
  }

  private throwError(error: string): never {
    Logger.error(error, LOG_CONTEXT);
    throw new BadRequestException(error);
  }
}
