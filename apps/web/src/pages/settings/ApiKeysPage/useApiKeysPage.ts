import { useState } from 'react';
import { useClipboard } from '@mantine/hooks';

import { useAPIKeys, useEnvironment } from '../../../hooks';
import { useRegenerateSecretKeyModal } from './useRegenerateApiKeyModal';
import { useApiKeys } from '../../../hooks/useNovuAPI';

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
  const { apiKey: secretKey } = useAPIKeys();
  const { environment } = useEnvironment();

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
