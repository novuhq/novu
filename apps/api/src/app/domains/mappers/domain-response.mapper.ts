import { DomainEntity } from '@novu/dal';
import { DomainResponseDto } from '../dtos/domain-response.dto';

export function toDomainResponse(domain: DomainEntity): DomainResponseDto {
  return {
    _id: domain._id,
    name: domain.name,
    status: domain.status,
    mxRecordConfigured: domain.mxRecordConfigured,
    dnsProvider: domain.dnsProvider,
    data: domain.data,
    _environmentId: domain._environmentId as unknown as string,
    _organizationId: domain._organizationId as unknown as string,
    createdAt: domain.createdAt,
    updatedAt: domain.updatedAt,
  };
}
