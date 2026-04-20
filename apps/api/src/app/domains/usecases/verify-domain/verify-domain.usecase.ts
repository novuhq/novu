import { promises as dnsPromises, type MxRecord } from 'node:dns';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { DomainRepository } from '@novu/dal';
import { DomainStatusEnum } from '@novu/shared';

import { DomainResponseDto } from '../../dtos/domain-response.dto';
import { toDomainResponse } from '../../mappers/domain-response.mapper';
import { buildExpectedDnsRecords, getMailServerDomain } from '../../utils/dns-records';
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
    const domain = await this.domainRepository.findOneByIdAndEnvironment(
      command.domainId,
      command.environmentId,
      command.organizationId
    );

    if (!domain) {
      throw new NotFoundException(`Domain with id "${command.domainId}" not found.`);
    }

    const INBOUND_DOMAIN = getMailServerDomain();
    if (!INBOUND_DOMAIN) {
      throw new BadRequestException('MAIL_SERVER_DOMAIN is not defined as an environment variable');
    }

    const mxRecordConfigured = await this.checkMxRecord(domain.name, INBOUND_DOMAIN);

    if (
      mxRecordConfigured !== domain.mxRecordConfigured ||
      (mxRecordConfigured && domain.status !== DomainStatusEnum.VERIFIED)
    ) {
      const newStatus = mxRecordConfigured ? DomainStatusEnum.VERIFIED : DomainStatusEnum.PENDING;

      await this.domainRepository.update(
        {
          _id: command.domainId,
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

  private async checkMxRecord(lookupDomain: string, expectedExchange: string): Promise<boolean> {
    try {
      const records: MxRecord[] = await dnsPromises.resolveMx(lookupDomain);

      return records.some((record) => record.exchange.toLowerCase() === expectedExchange.toLowerCase());
    } catch (error) {
      this.logger.warn(
        { err: error, lookupDomain, expectedExchange },
        'Failed to resolve MX records for domain verification'
      );

      return false;
    }
  }
}
