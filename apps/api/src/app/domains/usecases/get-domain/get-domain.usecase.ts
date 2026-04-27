import { Injectable } from '@nestjs/common';
import { DomainRepository } from '@novu/dal';
import { DomainResponseDto } from '../../dtos/domain-response.dto';
import { resolveDomainName } from '../domain-route.utils';
import { VerifyDomainCommand } from '../verify-domain/verify-domain.command';
import { VerifyDomain } from '../verify-domain/verify-domain.usecase';
import { GetDomainCommand } from './get-domain.command';

@Injectable()
export class GetDomain {
  constructor(
    private readonly domainRepository: DomainRepository,
    private readonly verifyDomainUsecase: VerifyDomain
  ) {}

  async execute(command: GetDomainCommand): Promise<DomainResponseDto> {
    const domain = await resolveDomainName({
      domainRepository: this.domainRepository,
      domain: command.domain,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    return this.verifyDomainUsecase.execute(
      VerifyDomainCommand.create({
        domainId: domain._id,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
      })
    );
  }
}
