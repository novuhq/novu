import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { buildRouteMatchContext, evaluateRules, InboundDomainRouteDelivery } from '@novu/application-generic';
import { DomainRepository, DomainRouteEntity, DomainRouteRepository } from '@novu/dal';
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
    const exactRoute = routes.find((r) => r.address === localPart);
    const wildcardRoute = routes.find((r) => r.address === '*');
    const mail = this.commandToMail(command);
    const route = this.selectRoute({
      exactRoute,
      wildcardRoute,
      domain,
      mail,
      toAddress,
    });

    if (!route) {
      Logger.log({ toAddress, domain: domain.name }, 'No route matched the inbound email', LOG_CONTEXT);

      return;
    }

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

  private selectRoute({
    exactRoute,
    wildcardRoute,
    domain,
    mail,
    toAddress,
  }: {
    exactRoute?: DomainRouteEntity;
    wildcardRoute?: DomainRouteEntity;
    domain: Parameters<typeof buildRouteMatchContext>[0];
    mail: ReturnType<DomainRouteStrategy['commandToMail']>;
    toAddress: string;
  }): DomainRouteEntity | undefined {
    if (!exactRoute && !wildcardRoute) {
      return undefined;
    }

    if (this.doesRouteMatch({ route: exactRoute, domain, mail, toAddress, candidate: 'exact' })) {
      return exactRoute;
    }

    if (this.doesRouteMatch({ route: wildcardRoute, domain, mail, toAddress, candidate: 'wildcard' })) {
      return wildcardRoute;
    }

    Logger.log({ toAddress, domain: domain.name }, 'Domain route match rules dropped the inbound email', LOG_CONTEXT);

    return undefined;
  }

  private doesRouteMatch({
    route,
    domain,
    mail,
    toAddress,
    candidate,
  }: {
    route?: DomainRouteEntity;
    domain: Parameters<typeof buildRouteMatchContext>[0];
    mail: ReturnType<DomainRouteStrategy['commandToMail']>;
    toAddress: string;
    candidate: 'exact' | 'wildcard';
  }): boolean {
    if (!route) {
      return false;
    }

    if (!route.match) {
      Logger.log(
        { toAddress, domain: domain.name, candidate, matchPassed: true },
        'Route has no match rule',
        LOG_CONTEXT
      );

      return true;
    }

    const context = buildRouteMatchContext(domain, route, mail);
    const evaluation = evaluateRules(route.match as never, context, true);
    if (evaluation.error) {
      Logger.warn(
        { toAddress, domain: domain.name, candidate, err: evaluation.error },
        'Route match rule evaluation failed',
        LOG_CONTEXT
      );
    }

    Logger.log(
      { toAddress, domain: domain.name, candidate, matchPassed: evaluation.result },
      'Evaluated route match rule',
      LOG_CONTEXT
    );

    return evaluation.result;
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
