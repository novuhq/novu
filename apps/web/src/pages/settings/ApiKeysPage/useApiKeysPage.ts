import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getApiKeys } from '../../../api/environment';
import { useEnvController } from '../../../hooks';
import { useClipboard } from '@mantine/hooks';

const CLIPBOARD_TIMEOUT_MS = 1000;

export const useApiKeysPage = () => {
  const clipboardApiKey = useClipboard({ timeout: CLIPBOARD_TIMEOUT_MS });
  const clipboardEnvironmentIdentifier = useClipboard({ timeout: CLIPBOARD_TIMEOUT_MS });
  const clipboardEnvironmentId = useClipboard({ timeout: CLIPBOARD_TIMEOUT_MS });
  const { data: apiKeys, refetch: refetchApiKeys } = useQuery<{ key: string }[]>(['getApiKeys'], getApiKeys);
  const { environment } = useEnvController();

  const apiKey = apiKeys?.length ? apiKeys[0].key : '';
  const environmentIdentifier = environment?.identifier ? environment.identifier : '';
  const environmentId = environment?._id ? environment._id : '';

  const [isApiKeyMasked, setIsApiKeyMasked] = useState<boolean>(true);

  const toggleApiKeyVisibility = () => setIsApiKeyMasked((prevHidden) => !prevHidden);

  return {
    apiKey,
    environmentIdentifier,
    environmentId,
    isApiKeyMasked,
    toggleApiKeyVisibility,
    clipboardApiKey,
    clipboardEnvironmentIdentifier,
    clipboardEnvironmentId,
    refetchApiKeys,
  };
};
