import { Injectable, Optional } from '@nestjs/common';
import { DomainRepository } from '@novu/dal';
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
 * - everything else (malformed addresses, unknown domains) returns empty
 *   strings so the row is still written and can be surfaced once tenant
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

      return {
        organizationId: domain?._organizationId ?? '',
        environmentId: domain?._environmentId ?? '',
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
