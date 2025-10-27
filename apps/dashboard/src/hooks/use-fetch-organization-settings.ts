import { useQuery } from '@tanstack/react-query';
import { IS_SELF_HOSTED } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { GetOrganizationSettingsDto, getOrganizationSettings } from '../api/organization';

export const useFetchOrganizationSettings = () => {
  const { currentEnvironment } = useEnvironment();

  const query = useQuery<{ data: GetOrganizationSettingsDto }>({
    queryKey: [QueryKeys.organizationSettings, currentEnvironment?._id],
    queryFn: async () => await getOrganizationSettings({ environment: currentEnvironment! }),
    enabled: !!currentEnvironment?._id && !IS_SELF_HOSTED,
    refetchOnMount: false,
  });

  return query;
};
