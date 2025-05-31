import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/utils/query-keys';
import { useEnvironment } from '@/context/environment/hooks';
import { getOrganizationSettings, GetOrganizationSettingsDto } from '../api/organization';

export const useFetchOrganizationSettings = () => {
  const { currentEnvironment } = useEnvironment();

  const query = useQuery<{ data: GetOrganizationSettingsDto }>({
    queryKey: [QueryKeys.organizationSettings, currentEnvironment?._id],
    queryFn: async () => await getOrganizationSettings({ environment: currentEnvironment! }),
    enabled: !!currentEnvironment?._id,
  });

  return query;
};
