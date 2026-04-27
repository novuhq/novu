import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AgentRepository, DomainRepository } from '@novu/dal';
import { DomainRouteTypeEnum } from '@novu/shared';

export function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

export function toDuplicateRouteConflict(address: string, type: DomainRouteTypeEnum): ConflictException {
  return new ConflictException(`A ${type} route for address "${address}" already exists.`);
}

export async function assertDomainExists({
  domainRepository,
  domainId,
  environmentId,
  organizationId,
}: {
  domainRepository: DomainRepository;
  domainId: string;
  environmentId: string;
  organizationId: string;
}): Promise<void> {
  const domain = await domainRepository.findOneByIdAndEnvironment(domainId, environmentId, organizationId);

  if (!domain) {
    throw new NotFoundException(`Domain with id "${domainId}" not found.`);
  }
}

export async function assertAgentDestination({
  agentRepository,
  destination,
  type,
  environmentId,
  organizationId,
}: {
  agentRepository: AgentRepository;
  destination?: string;
  type: DomainRouteTypeEnum;
  environmentId: string;
  organizationId: string;
}): Promise<void> {
  if (type !== DomainRouteTypeEnum.AGENT) return;

  if (!destination) {
    throw new BadRequestException('destination is required for agent routes.');
  }

  const agent = await agentRepository.findOne(
    {
      _id: destination,
      _environmentId: environmentId,
      _organizationId: organizationId,
    },
    ['_id']
  );

  if (!agent) {
    throw new NotFoundException(`Agent "${destination}" referenced in route destination does not exist.`);
  }
}
