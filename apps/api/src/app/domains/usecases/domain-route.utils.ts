import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AgentRepository, DomainEntity, DomainRepository } from '@novu/dal';
import { DomainRouteTypeEnum } from '@novu/shared';

export function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

export function toDuplicateRouteConflict(address: string, domainName: string): ConflictException {
  return new ConflictException(`A route for "${address}@${domainName}" already exists.`);
}

export async function resolveAgentIdentifier({
  agentRepository,
  identifier,
  environmentId,
  organizationId,
}: {
  agentRepository: AgentRepository;
  identifier: string;
  environmentId: string;
  organizationId: string;
}): Promise<string> {
  const agent = await agentRepository.findOne(
    {
      identifier,
      _environmentId: environmentId,
      _organizationId: organizationId,
    },
    ['_id']
  );

  if (!agent) {
    throw new NotFoundException(`Agent with identifier "${identifier}" not found.`);
  }

  return agent._id;
}

export async function resolveDomainName({
  domainRepository,
  domain,
  environmentId,
  organizationId,
}: {
  domainRepository: DomainRepository;
  domain: string;
  environmentId: string;
  organizationId: string;
}): Promise<DomainEntity> {
  const name = domain.toLowerCase();
  const domainEntity = await domainRepository.findOne(
    {
      name,
      _environmentId: environmentId,
      _organizationId: organizationId,
    },
    '*'
  );

  if (!domainEntity) {
    throw new NotFoundException(`Domain "${name}" not found.`);
  }

  return domainEntity;
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
    throw new BadRequestException('agentId is required for agent routes.');
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
    throw new NotFoundException(`Agent "${destination}" referenced by agentId does not exist.`);
  }
}
