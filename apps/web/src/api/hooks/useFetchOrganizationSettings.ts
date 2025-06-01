import { useQuery } from '@tanstack/react-query';
import { getOrganizationSettings, GetOrganizationSettingsDto } from '../organization';

export const useFetchOrganizationSettings = () => {
  const query = useQuery<{ data: GetOrganizationSettingsDto }>({
    queryKey: ['organizationSettings'],
    queryFn: async () => await getOrganizationSettings(),
  });

  return query;
};
