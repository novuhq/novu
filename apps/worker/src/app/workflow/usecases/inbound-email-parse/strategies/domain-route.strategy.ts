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
import {
  getDeliveryFailureDiagnostics,
  InboundParseDroppedError,
  InboundParseOutcome,
  InboundParseProcessingError,
  InboundParseStrategy,
  inboundTransactionIdFromMessageId,
  toCustomerDeliveryFailureMessage,
} from '../inbound-parse-outcome';

type ResolvedDomainRouteContext = {
  organizationId: string;
  environmentId: string;
  transactionId: string;
  strategy: InboundParseStrategy;
};

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

  async execute(command: InboundEmailParseCommand): Promise<InboundParseOutcome | undefined> {
    const toAddress = command.to[0].address;

    this.logger.info({ toAddress }, 'Processing domain-route email');

    const [rawLocalPart, rawDomainName] = toAddress.split('@');
    const localPart = rawLocalPart?.toLowerCase();
    const domainName = rawDomainName?.toLowerCase();

    if (!domainName) {
      this.throwError(`No domain found for address ${toAddress}`);
    }

    if (isAgentSharedInboxEnabled() && domainName === getSharedAgentDomain()) {
      return this.deliverSharedAgentInbox(command, toAddress, localPart);
    }

    const domain = await this.domainRepository.findByName(domainName);

    if (!domain) {
      this.throwError(`No domain found for address ${toAddress}`);
    }

    // Tenant context is resolved from the verified domain; failures from this
    // point on carry it so the centralized emit point can write a request log row.
    const baseResolved = {
      organizationId: domain._organizationId,
      environmentId: domain._environmentId,
      transactionId: inboundTransactionIdFromMessageId(command.messageId),
    };

    if (domain.status !== DomainStatusEnum.VERIFIED) {
      this.fail({ ...baseResolved, strategy: 'domain-route' }, 422, `Domain ${domain.name} is not verified`);
    }

    if (!domain.mxRecordConfigured) {
      this.fail(
        { ...baseResolved, strategy: 'domain-route' },
        422,
        `Domain ${domain.name} does not have MX records configured`
      );
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

      return { ...baseResolved, strategy: 'domain-route', status: 422, message: 'No matching inbound route' };
    }

    const mail = this.commandToMail(command);

    if (route.type === DomainRouteTypeEnum.WEBHOOK) {
      const resolved: ResolvedDomainRouteContext = { ...baseResolved, strategy: 'domain-route' };

      try {
        await this.inboundDomainRouteDelivery.deliverToWebhook({
          environmentId: domain._environmentId,
          organizationId: domain._organizationId,
          domain,
          route,
          mail,
        });
      } catch (err) {
        this.failDelivery(resolved, err);
      }

      this.logger.info({ toAddress, domain: domain.name }, 'Fired email.received webhook event');

      return { ...resolved, status: 200 };
    }

    if (route.type === DomainRouteTypeEnum.AGENT) {
      const resolved: ResolvedDomainRouteContext = { ...baseResolved, strategy: 'agent' };

      try {
        await this.inboundDomainRouteDelivery.deliverToAgent({
          domain,
          route,
          mail,
          toAddress,
        });
      } catch (err) {
        this.failDelivery(resolved, err);
      }

      this.logger.info({ toAddress, domain: domain.name }, 'Fired email.received agent event');

      return { ...resolved, status: 200 };
    }

    return { ...baseResolved, strategy: 'domain-route', status: 422, message: `Unsupported route type: ${route.type}` };
  }

  private fail(resolved: ResolvedDomainRouteContext, status: number, message: string): never {
    this.logger.error({ err: message }, 'Error processing domain-route email');
    const customerMessage = toCustomerDeliveryFailureMessage(status, message);
    throw new InboundParseProcessingError(message, { ...resolved, status, message: customerMessage });
  }

  private failDelivery(resolved: ResolvedDomainRouteContext, err: unknown): never {
    const diagnostics = getDeliveryFailureDiagnostics(err);

    this.logger.error(
      {
        err,
        statusCode: diagnostics.statusCode,
        responseBody: diagnostics.responseBody,
        organizationId: resolved.organizationId,
        environmentId: resolved.environmentId,
        transactionId: resolved.transactionId,
        strategy: resolved.strategy,
      },
      'Inbound domain-route delivery failed'
    );

    const customerMessage = toCustomerDeliveryFailureMessage(502, diagnostics.message);

    throw new InboundParseProcessingError(diagnostics.message, { ...resolved, status: 502, message: customerMessage });
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
  ): Promise<InboundParseOutcome | undefined> {
    if (!localPart) {
      this.logger.info({ toAddress }, 'Shared agent domain: missing local part - dropping');
      throw new InboundParseDroppedError('Shared agent domain: missing local part');
    }

    const parsed = parseAgentSharedInboxLocalPart(localPart);
    if (!parsed) {
      this.logger.info(
        { toAddress, localPart },
        'Shared agent domain: local part did not match {slug}-{inboxRoutingKey} - dropping'
      );
      throw new InboundParseDroppedError('Shared agent domain: local part did not match expected pattern');
    }

    const integration = await this.integrationRepository.findAgentInboundByInboxRoutingKey(parsed.inboxRoutingKey);
    if (!integration) {
      this.logger.info(
        { toAddress, inboxRoutingKey: parsed.inboxRoutingKey },
        'Shared agent domain: no integration found for routing key - dropping'
      );
      throw new InboundParseDroppedError('Shared agent domain: no integration found for routing key');
    }

    if (integration.active === false) {
      this.logger.info(
        { toAddress, integrationId: integration._id },
        'Shared agent domain: integration is inactive - dropping'
      );
      throw new InboundParseDroppedError('Shared agent domain: integration is inactive', {
        organizationId: integration._organizationId,
        environmentId: integration._environmentId,
      });
    }

    if (integration.credentials?.sharedInboxDisabled) {
      this.logger.info(
        { toAddress, integrationId: integration._id },
        'Shared agent domain: shared inbox disabled for this agent - dropping'
      );
      throw new InboundParseDroppedError('Shared agent domain: shared inbox disabled for this agent', {
        organizationId: integration._organizationId,
        environmentId: integration._environmentId,
      });
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
      throw new InboundParseDroppedError('Shared agent domain: no agent link found for integration', {
        organizationId: integration._organizationId,
        environmentId: integration._environmentId,
      });
    }

    const agent = await this.agentRepository.findByIdForWebhook(link._agentId);
    if (!agent) {
      this.logger.info(
        { toAddress, agentId: link._agentId },
        'Shared agent domain: no agent found for link - dropping'
      );
      throw new InboundParseDroppedError('Shared agent domain: no agent found for link', {
        organizationId: integration._organizationId,
        environmentId: integration._environmentId,
      });
    }

    if (agent.active === false) {
      this.logger.info({ toAddress, agentId: agent._id }, 'Shared agent domain: agent is inactive - dropping');
      throw new InboundParseDroppedError('Shared agent domain: agent is inactive', {
        organizationId: agent._organizationId,
        environmentId: agent._environmentId,
      });
    }

    const resolved: ResolvedDomainRouteContext = {
      organizationId: agent._organizationId,
      environmentId: agent._environmentId,
      transactionId: inboundTransactionIdFromMessageId(command.messageId),
      strategy: 'agent',
    };

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

      return { ...resolved, status: 200 };
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

        return { ...resolved, status: 422, message: 'Shared agent delivery rejected' };
      }

      this.failDelivery(resolved, err);
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
