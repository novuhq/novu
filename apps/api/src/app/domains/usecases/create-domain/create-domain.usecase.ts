import { ConflictException, Injectable } from '@nestjs/common';
import { ResourceValidatorService } from '@novu/application-generic';
import { DomainEntity, DomainRepository } from '@novu/dal';
import { DomainStatusEnum } from '@novu/shared';

import { DomainResponseDto } from '../../dtos/domain-response.dto';
import { toDomainResponse } from '../../mappers/domain-response.mapper';
import { detectDnsProvider } from '../../utils/dns-provider';
import { buildExpectedDnsRecords } from '../../utils/dns-records';
import { CreateDomainCommand } from './create-domain.command';

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

@Injectable()
export class CreateDomain {
  constructor(
    private readonly domainRepository: DomainRepository,
    private readonly resourceValidatorService: ResourceValidatorService
  ) {}

  async execute(command: CreateDomainCommand): Promise<DomainResponseDto> {
    await this.resourceValidatorService.validateDomainsLimit(command.organizationId);
    const name = command.name.toLowerCase();

    const existing = await this.domainRepository.findByName(name);

    if (existing) {
      throw new ConflictException(`A domain with name "${name}" already exists.`);
    }

    const dnsProvider = await detectDnsProvider(name);

    let domain: DomainEntity;

    try {
      domain = await this.domainRepository.create({
        name,
        status: DomainStatusEnum.PENDING,
        mxRecordConfigured: false,
        dnsProvider: dnsProvider ?? undefined,
        ...(command.data !== undefined ? { data: command.data } : {}),
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      });
    } catch (err: unknown) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException(`A domain with name "${name}" already exists.`);
      }

      throw err;
    }

    return {
      ...toDomainResponse(domain),
      expectedDnsRecords: buildExpectedDnsRecords(domain.name),
    };
  }
}
