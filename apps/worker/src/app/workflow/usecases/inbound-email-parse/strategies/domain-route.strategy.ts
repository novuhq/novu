import { BadRequestException, Injectable } from '@nestjs/common';
import {
  getConfiguredSharedInboxDomains,
  InboundDomainRouteDelivery,
  isAgentSharedInboxEnabled,
  isValidAgentEmailSlugPrefix,
  PinoLogger,
  parseAgentSharedInboxLocalPart,
  resolveAgentInboxDomain,
  resolvePublishedAgentEmailSlug,
} from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentRepository,
  DomainRepository,
  DomainRouteRepository,
  type IntegrationEntity,
  IntegrationRepository,
} from '@novu/dal';
import { DomainRouteTypeEnum, DomainStatusEnum, splitAgentReplyLocalPart } from '@novu/shared';
import { InboundEmailParseCommand } from '../inbound-email-parse.command';
import {
  getDeliveryFailureDiagnostics,
  INBOUND_UNMATCHED_ROUTE_MESSAGE,
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

  async execute(
    command: InboundEmailParseCommand,
    recipientAddress = command.to[0].address
  ): Promise<InboundParseOutcome | undefined> {
    const toAddress = recipientAddress;

    this.logger.info({ toAddress }, 'Processing domain-route email');

    const [rawLocalPart, rawDomainName] = toAddress.split('@');
    const localPart = rawLocalPart?.toLowerCase();
    const domainName = rawDomainName?.toLowerCase();
    const { strippedLocalPart, originToken } = localPart
      ? splitAgentReplyLocalPart(localPart)
      : { strippedLocalPart: localPart, originToken: null };

    if (!domainName) {
      this.throwError(`No domain found for address ${toAddress}`);
    }

    if (isAgentSharedInboxEnabled() && getConfiguredSharedInboxDomains().includes(domainName)) {
      return this.deliverSharedAgentInbox(command, toAddress, strippedLocalPart, originToken, domainName);
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

    const addressCandidates = Array.from(
      new Set([localPart, strippedLocalPart, '*'].filter((value): value is string => Boolean(value)))
    );
    const routes = await this.domainRouteRepository.findByDomainAndAddresses({
      domainId: domain._id,
      environmentId: domain._environmentId,
      organizationId: domain._organizationId,
      addresses: addressCandidates,
    });
    let route = localPart ? routes.find((r) => r.address === localPart) : undefined;

    if (!route && strippedLocalPart && strippedLocalPart !== localPart) {
      route = routes.find((r) => r.address === strippedLocalPart);
    }

    if (!route) {
      route = routes.find((r) => r.address === '*');
    }

    if (!route) {
      this.logger.info({ toAddress, domain: domain.name }, 'No route matched the inbound email');

      return { ...baseResolved, strategy: 'domain-route', status: 422, message: INBOUND_UNMATCHED_ROUTE_MESSAGE };
    }

    const mail = this.commandToMail(command, toAddress);

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
          originToken: originToken ?? undefined,
        });
      } catch (err) {
        this.failDelivery(resolved, err);
      }

      this.logger.info(
        { toAddress, domain: domain.name, messageId: command.messageId, dkim: command.dkim, spf: command.spf },
        'Fired email.received agent event'
      );

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
   * Inbound email arrived at a shared agent domain (`agentconnect.sh`, or the
   * Agent Inbox domain). A local-part of `{slug}-{inboxRoutingKey}` resolves
   * via `credentials.inboxRoutingKey`. Anything else, and a key that belongs
   * to another domain, is looked up as a vanity Agent Inbox handle: the whole
   * local-part on this domain. Then we join through `AgentIntegration` and
   * reuse `InboundDomainRouteDelivery.deliverToAgent`.
   *
   * The matched domain has to be the one pinned on that integration. A Connect
   * agent is not reachable on the Agent Inbox domain, and an Agent Inbox agent
   * pinned to the new domain is not reachable on `agentconnect.sh`. Rows with
   * no pin still accept the Connect domain.
   *
   * Unknown routing keys, malformed local-parts, missing links, and agents
   * whose inbox integration is disabled all result in silently dropping
   * the message (after logging).
   */
  private async deliverSharedAgentInbox(
    command: InboundEmailParseCommand,
    toAddress: string,
    localPart: string | undefined,
    originToken: string | null,
    domainName: string
  ): Promise<InboundParseOutcome | undefined> {
    if (!localPart) {
      this.logger.info({ toAddress }, 'Shared agent domain: missing local part - dropping');
      throw new InboundParseDroppedError('Shared agent domain: missing local part');
    }

    const { integration, vanity, parsed } = await this.findSharedAgentInbox(toAddress, localPart, domainName);
    // The slug has to be the agent's own, checked in two phases: a stored prefix
    // settles it before any further lookups, while the published fallback is
    // derived from the agent and so has to wait until the agent is loaded.
    // A vanity address was looked up by the whole local-part, so the slug already matches.
    const storedSlug = vanity ? localPart : integration.credentials?.emailSlugPrefix;
    const hasAuthoritativeSlug = typeof storedSlug === 'string' && isValidAgentEmailSlugPrefix(storedSlug);

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

    // Phase two of the slug check: no stored prefix, so the agent decides.
    if (!vanity && parsed && !hasAuthoritativeSlug) {
      const publishedSlug = resolvePublishedAgentEmailSlug(storedSlug, agent);
      if (publishedSlug !== parsed.slug) {
        this.logger.info(
          { toAddress, integrationId: integration._id, slug: parsed.slug, publishedSlug },
          'Shared agent domain: slug does not match the published inbox address - dropping'
        );
        throw new InboundParseDroppedError('Shared agent domain: slug does not match the published inbox address', {
          organizationId: agent._organizationId,
          environmentId: agent._environmentId,
        });
      }
    }

    const resolved: ResolvedDomainRouteContext = {
      organizationId: agent._organizationId,
      environmentId: agent._environmentId,
      transactionId: inboundTransactionIdFromMessageId(command.messageId),
      strategy: 'agent',
    };

    const syntheticDomain = {
      _id: agent._id,
      name: domainName,
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
        mail: this.commandToMail(command, toAddress),
        toAddress,
        originToken: originToken ?? undefined,
        integrationId: integration._id,
      });
      this.logger.info(
        { toAddress, agentId: agent._id, messageId: command.messageId, dkim: command.dkim, spf: command.spf },
        'Forwarded shared-domain inbound email to agent webhook'
      );

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

  /**
   * A `{slug}-{key}` whose key belongs to this domain is authoritative: a slug
   * mismatch drops the mail. Anything else is a vanity handle, the whole local-part.
   */
  private async findSharedAgentInbox(
    toAddress: string,
    localPart: string,
    domainName: string
  ): Promise<{
    integration: IntegrationEntity;
    vanity: boolean;
    parsed: ReturnType<typeof parseAgentSharedInboxLocalPart>;
  }> {
    const parsed = parseAgentSharedInboxLocalPart(localPart);
    const keyed = parsed
      ? await this.integrationRepository.findAgentInboundByInboxRoutingKey(parsed.inboxRoutingKey)
      : null;
    const keyedHere = keyed && domainName === resolveAgentInboxDomain(keyed.credentials) ? keyed : null;

    if (keyedHere && parsed) {
      this.dropWhenKeyedSlugDiffers(keyedHere, parsed, toAddress);

      return { integration: keyedHere, vanity: false, parsed };
    }

    const integration = await this.integrationRepository.findAgentInboundByVanitySlug(localPart, domainName);
    if (!integration) {
      this.logger.info({ toAddress, localPart }, 'Shared agent domain: no inbox for this address - dropping');
      throw new InboundParseDroppedError('Shared agent domain: no inbox for this address');
    }

    return { integration, vanity: true, parsed };
  }

  private dropWhenKeyedSlugDiffers(
    integration: IntegrationEntity,
    parsed: { slug: string; inboxRoutingKey: string },
    toAddress: string
  ): void {
    const storedSlug = integration.credentials?.emailSlugPrefix;
    const authoritative = typeof storedSlug === 'string' && isValidAgentEmailSlugPrefix(storedSlug);
    if (!authoritative || storedSlug === parsed.slug) {
      return;
    }

    this.logger.info(
      { toAddress, integrationId: integration._id, slug: parsed.slug },
      'Shared agent domain: slug does not match the integration - dropping'
    );
    throw new InboundParseDroppedError('Shared agent domain: slug does not match the integration', {
      organizationId: integration._organizationId,
      environmentId: integration._environmentId,
    });
  }

  private commandToMail(command: InboundEmailParseCommand, recipientAddress: string) {
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
      bcc: getBccRecipients(command, recipientAddress),
      // Forward the inbound-mail DKIM/SPF verdicts so the agent runtime can
      // reject identity resolution for spoofed (unverified) senders.
      dkim: command.dkim,
      spf: command.spf,
    };
  }

  private throwError(error: string): never {
    this.logger.error({ err: error }, 'Error processing domain-route email');
    throw new BadRequestException(error);
  }
}

function getBccRecipients(command: InboundEmailParseCommand, recipientAddress: string) {
  const normalizedRecipientAddress = recipientAddress.trim().toLowerCase();
  const visibleRecipients = [...(command.to ?? []), ...(command.cc ?? [])];
  const isVisibleRecipient = visibleRecipients.some(
    (recipient) =>
      recipient &&
      typeof recipient === 'object' &&
      'address' in recipient &&
      typeof recipient.address === 'string' &&
      recipient.address.trim().toLowerCase() === normalizedRecipientAddress
  );

  if (isVisibleRecipient) {
    return undefined;
  }

  return [{ address: recipientAddress, name: '' }];
}
