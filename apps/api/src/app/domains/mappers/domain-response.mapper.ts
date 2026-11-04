import { DomainEntity } from '@novu/dal';
import { resolveInboundSenderAuth } from '@novu/shared';
import { DomainResponseDto } from '../dtos/domain-response.dto';

export function toDomainResponse(domain: DomainEntity): DomainResponseDto {
  return {
    _id: domain._id,
    name: domain.name,
    status: domain.status,
    mxRecordConfigured: domain.mxRecordConfigured,
    dnsProvider: domain.dnsProvider,
    data: domain.data,
    inboundSenderAuth: resolveInboundSenderAuth(domain.inboundSenderAuth),
    _environmentId: domain._environmentId,
    _organizationId: domain._organizationId,
    createdAt: domain.createdAt,
    updatedAt: domain.updatedAt,
  };
}
