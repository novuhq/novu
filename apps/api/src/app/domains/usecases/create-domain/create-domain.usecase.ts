import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  AgentEntitlementsService,
  getSharedAgentDomain,
  isAgentSharedInboxEnabled,
  ResourceValidatorService,
} from '@novu/application-generic';
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
    private readonly resourceValidatorService: ResourceValidatorService,
    private readonly agentEntitlementsService: AgentEntitlementsService
  ) {}

  async execute(command: CreateDomainCommand): Promise<DomainResponseDto> {
    await this.resourceValidatorService.validateDomainsLimit(command.organizationId);
    await this.validateCustomEmailDomainTierLimit(command.organizationId);
    const name = command.name.toLowerCase();

    if (isAgentSharedInboxEnabled() && name === getSharedAgentDomain()) {
      throw new BadRequestException(
        `The domain "${name}" is reserved for Novu's shared agent inbox and cannot be claimed.`
      );
    }

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

  /**
   * Enforces the per-plan custom email domain count limit (Team = 1, Enterprise =
   * unlimited with a LaunchDarkly soft cap). This complements the route-level
   * `@ProductFeature(CUSTOM_DOMAINS)` gate, which already blocks Free/Pro entirely.
   */
  private async validateCustomEmailDomainTierLimit(organizationId: string): Promise<void> {
    const limit = await this.agentEntitlementsService.getCustomEmailDomainLimit(organizationId);
    const domainsCount = await this.domainRepository.count({ _organizationId: organizationId });

    if (domainsCount >= limit) {
      throw new HttpException(
        {
          error: 'Payment Required',
          message: `Your plan includes ${limit} custom email domain${
            limit === 1 ? '' : 's'
          }. Please upgrade your plan to add more.`,
          currentCount: domainsCount,
          limit,
        },
        HttpStatus.PAYMENT_REQUIRED
      );
    }
  }
}
