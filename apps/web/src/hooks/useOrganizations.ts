import { useQuery } from '@tanstack/react-query';
import { IOrganizationEntity } from '@novu/shared';
import { getOrganizations } from '../api/organization';

export function useOrganizations() {
  return useQuery<IOrganizationEntity[]>(['/v1/organizations'], getOrganizations);
}
