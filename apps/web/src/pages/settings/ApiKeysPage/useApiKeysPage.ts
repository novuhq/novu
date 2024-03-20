import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getApiKeys } from '../../../api/environment';
import { useEnvController } from '../../../hooks';
import { useClipboard } from '@mantine/hooks';
import { useRegenerateApiKeyModal } from './useRegenerateApiKeyModal';
import { BaseEnvironmentEnum } from '@novu/shared-web';

const CLIPBOARD_TIMEOUT_MS = 2000;

/*
 * type ApiKeysPageUrlParams = {
 *   env: BaseEnvironmentEnum;
 * };
 */

export const useApiKeysPage = () => {
  /**
   * TODO: we will eventually want to use the URL params instead of the current environment, but
   * this will come at a later time once we have the APIs to support it.
   *
   * const { env } = useParams<ApiKeysPageUrlParams>();
   */

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

  const regenerationModalProps = useRegenerateApiKeyModal();

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
    pageEnv: environment?.name ?? '',
    regenerationModalProps,
  };
};
