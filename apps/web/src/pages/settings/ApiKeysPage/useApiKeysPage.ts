import { useState } from 'react';
import { useClipboard } from '@mantine/hooks';
import { useEnvironment, useApiKeys } from '../../../hooks';
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
  const { environment } = useEnvironment();

  const environmentIdentifier = environment?.identifier ? environment.identifier : '';
  const { data: secretKeys } = useApiKeys();

  const secretKey = secretKeys?.length ? secretKeys[0].key : '';

  const [isSecretKeyMasked, setIsSecretKeyMasked] = useState<boolean>(true);

  const toggleSecretKeyVisibility = () => setIsSecretKeyMasked((prevHidden) => !prevHidden);

  const regenerationModalProps = useRegenerateSecretKeyModal();

  return {
    secretKey,
    environmentIdentifier,
    environmentId: environment?._id,
    isSecretKeyMasked,
    toggleSecretKeyVisibility,
    clipboardSecretKey,
    clipboardEnvironmentIdentifier,
    clipboardEnvironmentId,
    regenerationModalProps,
  };
};
