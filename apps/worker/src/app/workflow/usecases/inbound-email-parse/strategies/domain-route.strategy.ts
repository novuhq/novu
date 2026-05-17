import { BadRequestException, Injectable } from '@nestjs/common';
import {
  getSharedAgentDomain,
  InboundDomainRouteDelivery,
  isAgentSharedInboxEnabled,
  PinoLogger,
  parseAgentSharedInboxLocalPart,
} from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentRepository,
  DomainRepository,
  DomainRouteRepository,
  IntegrationRepository,
} from '@novu/dal';
import { DomainRouteTypeEnum, DomainStatusEnum } from '@novu/shared';
import { InboundEmailParseCommand } from '../inbound-email-parse.command';

@Injectable()
export class DomainRouteStrategy {
  constructor(
    private domainRepository: DomainRepository,
    private domainRouteRepository: DomainRouteRepository,
    private inboundDomainRouteDelivery: InboundDomainRouteDelivery,
    private agentRepository: AgentRepository,
    private integrationRepository: IntegrationRepository,
    private agentIntegrationRepository: AgentIntegrationRepository,
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

    if (isAgentSharedInboxEnabled() && domainName === getSharedAgentDomain()) {
      await this.deliverSharedAgentInbox(command, toAddress, localPart);

      return;
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

  /**
   * Inbound email arrived at the shared agent domain (e.g. `agentconnect.sh`).
   * The local-part shape is `{slug}-{inboxRoutingKey}` (see
   * `parseAgentSharedInboxLocalPart`). We resolve the owning NovuAgent
   * integration via its `credentials.inboxRoutingKey` (backed by a partial
   * unique index, cross-tenant), then join through `AgentIntegration` to find
   * the agent, then reuse the existing `InboundDomainRouteDelivery.deliverToAgent`
   * pipeline — which enforces `Integration.active=true` and signs/forwards the
   * payload to the API webhook just like the standard per-tenant flow.
   *
   * Unknown routing keys, malformed local-parts, missing links, and agents
   * whose NovuAgent integration is disabled all result in silently dropping
   * the message (after logging).
   */
  private async deliverSharedAgentInbox(
    command: InboundEmailParseCommand,
    toAddress: string,
    localPart: string | undefined
  ): Promise<void> {
    if (!localPart) {
      this.logger.info({ toAddress }, 'Shared agent domain: missing local part - dropping');

      return;
    }

    const parsed = parseAgentSharedInboxLocalPart(localPart);
    if (!parsed) {
      this.logger.info(
        { toAddress, localPart },
        'Shared agent domain: local part did not match {slug}-{inboxRoutingKey} - dropping'
      );

      return;
    }

    const integration = await this.integrationRepository.findAgentInboundByInboxRoutingKey(parsed.inboxRoutingKey);
    if (!integration) {
      this.logger.info(
        { toAddress, inboxRoutingKey: parsed.inboxRoutingKey },
        'Shared agent domain: no integration found for routing key - dropping'
      );

      return;
    }

    if (integration.active === false) {
      this.logger.info(
        { toAddress, integrationId: integration._id },
        'Shared agent domain: integration is inactive - dropping'
      );

      return;
    }

    if (integration.credentials?.sharedInboxDisabled) {
      this.logger.info(
        { toAddress, integrationId: integration._id },
        'Shared agent domain: shared inbox disabled for this agent - dropping'
      );

      return;
    }

    const link = await this.agentIntegrationRepository.findOne(
      {
        _integrationId: integration._id,
        _environmentId: integration._environmentId,
        _organizationId: integration._organizationId,
      },
      ['_agentId']
    );
    if (!link) {
      this.logger.info(
        { toAddress, integrationId: integration._id },
        'Shared agent domain: no agent link found for integration - dropping'
      );

      return;
    }

    const agent = await this.agentRepository.findByIdForWebhook(link._agentId);
    if (!agent) {
      this.logger.info(
        { toAddress, agentId: link._agentId },
        'Shared agent domain: no agent found for link - dropping'
      );

      return;
    }

    if (agent.active === false) {
      this.logger.info({ toAddress, agentId: agent._id }, 'Shared agent domain: agent is inactive - dropping');

      return;
    }

    const syntheticDomain = {
      _id: agent._id,
      name: getSharedAgentDomain(),
      status: DomainStatusEnum.VERIFIED,
      mxRecordConfigured: true,
      _environmentId: agent._environmentId,
      _organizationId: agent._organizationId,
      data: {},
    };

    const syntheticRoute = {
      _id: agent._id,
      _domainId: agent._id,
      address: localPart,
      destination: agent._id,
      type: DomainRouteTypeEnum.AGENT,
      data: {},
      _environmentId: agent._environmentId,
      _organizationId: agent._organizationId,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    } as Parameters<typeof this.inboundDomainRouteDelivery.deliverToAgent>[0]['route'];

    try {
      await this.inboundDomainRouteDelivery.deliverToAgent({
        domain: syntheticDomain,
        route: syntheticRoute,
        mail: this.commandToMail(command),
        toAddress,
      });
      this.logger.info({ toAddress, agentId: agent._id }, 'Forwarded shared-domain inbound email to agent webhook');
    } catch (err) {
      // BadRequestException is thrown by InboundDomainRouteDelivery for non-retriable
      // routing failures (no integration linked, integration inactive, missing secret,
      // missing API_ROOT_URL). Drop the message silently so the queue doesn't retry.
      // Any other error (HTTP timeout, transient API outage, etc.) is rethrown so the
      // worker queue can retry per the standard inbound-parse retry policy.
      if (err instanceof BadRequestException) {
        this.logger.warn(
          { toAddress, agentId: agent._id, err },
          'Shared agent domain: deliverToAgent rejected - dropping (integration inactive or misconfigured)'
        );

        return;
      }

      throw err;
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
