import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useClipboard } from '@mantine/hooks';

import { getApiKeys } from '../../../api/environment';
import { useEnvironment } from '../../../hooks';
import { useRegenerateSecretKeyModal } from './useRegenerateApiKeyModal';

const CLIPBOARD_TIMEOUT_MS = 2000;

export const useApiKeysPage = () => {
  /**
   * TODO: we will eventually want to use the URL params instead of the current environment, but
   * this will come at a later time once we have the APIs to support it.
   *
   * const { env } = useParams<'env'>();
   */

  const clipboardSecretKey = useClipboard({ timeout: CLIPBOARD_TIMEOUT_MS });
  const clipboardEnvironmentIdentifier = useClipboard({ timeout: CLIPBOARD_TIMEOUT_MS });
  const clipboardEnvironmentId = useClipboard({ timeout: CLIPBOARD_TIMEOUT_MS });
  const { data: secretKeys } = useQuery<{ key: string }[]>(['getApiKeys'], getApiKeys);
  const { environment } = useEnvironment();

  const secretKey = secretKeys?.length ? secretKeys[0].key : '';
  const environmentIdentifier = environment?.identifier ? environment.identifier : '';
  const environmentId = environment?._id ? environment._id : '';

  const [isSecretKeyMasked, setIsSecretKeyMasked] = useState<boolean>(true);

  const toggleSecretKeyVisibility = () => setIsSecretKeyMasked((prevHidden) => !prevHidden);

  const regenerationModalProps = useRegenerateSecretKeyModal();

  return {
    secretKey,
    environmentIdentifier,
    environmentId,
    isSecretKeyMasked,
    toggleSecretKeyVisibility,
    clipboardSecretKey,
    clipboardEnvironmentIdentifier,
    clipboardEnvironmentId,
    pageEnv: environment?.name ?? '',
    regenerationModalProps,
  };
};
