import { BadRequestException, Injectable } from '@nestjs/common';
import { InboundDomainRouteDelivery, PinoLogger } from '@novu/application-generic';
import { DomainRepository, DomainRouteRepository } from '@novu/dal';
import { DomainRouteTypeEnum, DomainStatusEnum } from '@novu/shared';
import { InboundEmailParseCommand } from '../inbound-email-parse.command';

@Injectable()
export class DomainRouteStrategy {
  constructor(
    private domainRepository: DomainRepository,
    private domainRouteRepository: DomainRouteRepository,
    private inboundDomainRouteDelivery: InboundDomainRouteDelivery,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: InboundEmailParseCommand): Promise<void> {
    const toAddress = command.to[0].address;

    this.logger.info({ toAddress }, 'Processing domain-route email');

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
      this.logger.info({ toAddress, domain: domain.name }, 'No route matched the inbound email');

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

      this.logger.info({ toAddress, domain: domain.name }, 'Fired email.received webhook event');

      return;
    }

    if (route.type === DomainRouteTypeEnum.AGENT) {
      await this.inboundDomainRouteDelivery.deliverToAgent({
        domain,
        route,
        mail,
        toAddress,
      });

      this.logger.info({ toAddress, domain: domain.name }, 'Fired email.received agent event');
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
    this.logger.error({ err: error }, 'Error processing domain-route email');
    throw new BadRequestException(error);
  }
}
