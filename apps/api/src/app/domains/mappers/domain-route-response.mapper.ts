import { DomainRouteEntity } from '@novu/dal';
import { DomainRouteResponseDto } from '../dtos/domain-route-response.dto';

export function toDomainRouteResponse(route: DomainRouteEntity): DomainRouteResponseDto {
  return {
    _id: route._id,
    _domainId: route._domainId as unknown as string,
    address: route.address,
    agentId: route.destination,
    type: route.type,
    data: route.data,
    _environmentId: route._environmentId as unknown as string,
    _organizationId: route._organizationId as unknown as string,
    createdAt: route.createdAt,
    updatedAt: route.updatedAt,
  };
}
