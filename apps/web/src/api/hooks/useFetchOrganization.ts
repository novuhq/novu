import { useQuery } from '@tanstack/react-query';
import type { IOrganizationEntity } from '@novu/shared';
import { getOrganization } from '../organization';

export const useFetchOrganization = () => {
  const query = useQuery<IOrganizationEntity>({
    queryKey: ['/v1/organizations/me'],
    queryFn: async () => {
      const response = await getOrganization();
      return response;
    },
  });

  return query;
};
