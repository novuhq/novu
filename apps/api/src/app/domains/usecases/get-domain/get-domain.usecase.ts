import { Injectable, NotFoundException } from '@nestjs/common';
import { DomainRepository } from '@novu/dal';
import { DomainResponseDto } from '../../dtos/domain-response.dto';
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
    const domain = await this.domainRepository.findOneByIdAndEnvironment(
      command.domainId,
      command.environmentId,
      command.organizationId
    );

    if (!domain) {
      throw new NotFoundException(`Domain with id "${command.domainId}" not found.`);
    }

    return this.verifyDomainUsecase.execute(
      VerifyDomainCommand.create({
        domainId: command.domainId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
      })
    );
  }
}
