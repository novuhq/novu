import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useClipboard } from '@mantine/hooks';

import { getApiKeys } from '../../../api/environment';
import { useEnvController } from '../../../hooks';
import { useRegenerateApiKeyModal } from './useRegenerateApiKeyModal';

const CLIPBOARD_TIMEOUT_MS = 2000;

export const useApiKeysPage = () => {
  /**
   * TODO: we will eventually want to use the URL params instead of the current environment, but
   * this will come at a later time once we have the APIs to support it.
   *
   * const { env } = useParams<'env'>();
   */

  const clipboardApiKey = useClipboard({ timeout: CLIPBOARD_TIMEOUT_MS });
  const clipboardEnvironmentIdentifier = useClipboard({ timeout: CLIPBOARD_TIMEOUT_MS });
  const clipboardEnvironmentId = useClipboard({ timeout: CLIPBOARD_TIMEOUT_MS });
  const { data: apiKeys } = useQuery<{ key: string }[]>(['getApiKeys'], getApiKeys);
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
    pageEnv: environment?.name ?? '',
    regenerationModalProps,
  };
};
