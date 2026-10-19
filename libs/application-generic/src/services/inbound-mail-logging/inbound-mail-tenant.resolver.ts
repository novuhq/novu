import { Injectable, Optional } from '@nestjs/common';
import { DomainRepository } from '@novu/dal';
import { DomainStatusEnum } from '@novu/shared';
import { PinoLogger } from '../../logging';
import { generateObjectId } from '../../utils/generate-id';
import { inferInboundParseStrategy, parseReplyToAddress } from './inbound-request-metadata';

/**
 * Tenant context for an inbound mail message at the time it is first logged
 * (in `apps/inbound-mail`). The values are best-effort:
 *
 * - reply-to addresses encode `environmentId` in the local-part, so we can
 *   resolve it without a DB lookup; `organizationId` requires a job lookup
 *   that the worker performs later
 * - domain-route addresses resolve org+env from a globally-unique domain name
 *   ONLY when the domain is verified and MX-configured (matching the worker's
 *   inbound enforcement); unverified domains are treated as unattributed to
 *   prevent unauthenticated SMTP senders from polluting a tenant's request log
 * - everything else (malformed addresses, unknown/unverified domains) returns
 *   empty strings so the row is still written and can be surfaced once tenant
 *   context is known
 */
export interface InboundMailTenant {
  organizationId: string;
  environmentId: string;
  transactionId: string;
}

@Injectable()
export class InboundMailTenantResolver {
  constructor(
    @Optional() private readonly domainRepository?: DomainRepository,
    @Optional() private readonly logger?: PinoLogger
  ) {
    this.logger?.setContext(this.constructor.name);
  }

  /**
   * Resolves the tenant context to scope the early request log row.
   *
   * `transactionId` falls back to a deterministic id derived from the RFC 5322
   * Message-ID so retries of the same email collapse onto one logical request.
   * The `req_` request log id itself is generated separately (and is the
   * dedup key inside ClickHouse).
   */
  async resolve(toAddress: string, messageId: string | undefined): Promise<InboundMailTenant> {
    const strategy = inferInboundParseStrategy(toAddress);

    if (strategy === 'reply-to') {
      const parsed = parseReplyToAddress(toAddress);
      if (parsed) {
        return {
          organizationId: '',
          environmentId: parsed.environmentId,
          transactionId: parsed.transactionId,
        };
      }

      return { organizationId: '', environmentId: '', transactionId: this.fallbackTransactionId(messageId) };
    }

    const domainName = toAddress.split('@')[1]?.toLowerCase();
    if (!domainName || !this.domainRepository) {
      return { organizationId: '', environmentId: '', transactionId: this.fallbackTransactionId(messageId) };
    }

    try {
      const domain = await this.domainRepository.findByName(domainName);

      /*
       * Only attribute the early request log row to a tenant when the domain is
       * fully validated for inbound routing — matching the worker's enforcement
       * in `domain-route.strategy.ts`. Without this guard, an unauthenticated
       * SMTP sender could create tenant-scoped request rows for any domain that
       * merely exists in Mongo (e.g. pending verification, missing MX), polluting
       * that tenant's operational/audit signals. Unverified or MX-misconfigured
       * domains still get a row written, just unattributed.
       */
      const isVerifiedForInbound =
        !!domain && domain.status === DomainStatusEnum.VERIFIED && domain.mxRecordConfigured === true;

      return {
        organizationId: isVerifiedForInbound ? (domain._organizationId ?? '') : '',
        environmentId: isVerifiedForInbound ? (domain._environmentId ?? '') : '',
        transactionId: this.fallbackTransactionId(messageId),
      };
    } catch (error) {
      this.logger?.warn(
        { err: error, domainName },
        'Failed to resolve inbound mail tenant from domain — proceeding with empty tenant context'
      );

      return { organizationId: '', environmentId: '', transactionId: this.fallbackTransactionId(messageId) };
    }
  }

  private fallbackTransactionId(messageId: string | undefined): string {
    const cleaned = messageId?.replace(/[<>]/g, '').trim();

    return cleaned || `inbound_${generateObjectId()}`;
  }
}
