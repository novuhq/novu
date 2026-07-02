import { promises as dnsPromises, type MxRecord } from 'node:dns';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { DomainRepository } from '@novu/dal';
import { DomainStatusEnum } from '@novu/shared';

import { DomainResponseDto } from '../../dtos/domain-response.dto';
import { toDomainResponse } from '../../mappers/domain-response.mapper';
import { buildExpectedDnsRecords, getMailServerDomain } from '../../utils/dns-records';
import { resolveDomainName } from '../domain-route.utils';
import { VerifyDomainCommand } from './verify-domain.command';

@Injectable()
export class VerifyDomain {
  constructor(
    private readonly domainRepository: DomainRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: VerifyDomainCommand): Promise<DomainResponseDto> {
    const domain = await resolveDomainName({
      domainRepository: this.domainRepository,
      domain: command.domain,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    const INBOUND_DOMAIN = getMailServerDomain();
    if (!INBOUND_DOMAIN) {
      throw new BadRequestException('MAIL_SERVER_DOMAIN is not defined as an environment variable');
    }

    const result = await this.checkMxRecord(domain.name, INBOUND_DOMAIN);

    // For transient DNS failures (non-definitive), preserve the existing state to
    // prevent a verified domain from being incorrectly demoted back to pending.
    const mxRecordConfigured = result.definitive ? result.configured : domain.mxRecordConfigured;

    if (
      mxRecordConfigured !== domain.mxRecordConfigured ||
      (mxRecordConfigured && domain.status !== DomainStatusEnum.VERIFIED)
    ) {
      const newStatus = mxRecordConfigured ? DomainStatusEnum.VERIFIED : DomainStatusEnum.PENDING;

      await this.domainRepository.update(
        {
          _id: domain._id,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        { $set: { mxRecordConfigured, status: newStatus } }
      );

      domain.mxRecordConfigured = mxRecordConfigured;
      domain.status = newStatus;
    }

    return {
      ...toDomainResponse(domain),
      expectedDnsRecords: buildExpectedDnsRecords(domain.name),
    };
  }

  private async checkMxRecord(
    lookupDomain: string,
    expectedExchange: string
  ): Promise<{ configured: boolean; definitive: boolean }> {
    try {
      const records: MxRecord[] = await dnsPromises.resolveMx(lookupDomain);
      const configured = records.some((record) => record.exchange.toLowerCase() === expectedExchange.toLowerCase());

      return { configured, definitive: true };
    } catch (error) {
      if (isExpectedDnsLookupMiss(error)) {
        this.logger.debug(
          { lookupDomain, expectedExchange, code: (error as NodeJS.ErrnoException).code },
          'MX record is not configured for domain verification yet'
        );

        return { configured: false, definitive: true };
      }

      this.logger.warn(
        { err: error, lookupDomain, expectedExchange },
        'Failed to resolve MX records for domain verification'
      );

      return { configured: false, definitive: false };
    }
  }
}

function isExpectedDnsLookupMiss(error: unknown): error is NodeJS.ErrnoException {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;

  return code === 'ENOTFOUND' || code === 'ENODATA';
}
