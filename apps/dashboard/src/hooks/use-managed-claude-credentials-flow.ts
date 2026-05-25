import { useCallback, useRef, useState } from 'react';

import type { VerifyStatus } from '@/components/agents/create-agent-fields';

export function useManagedClaudeCredentialsFlow() {
  const [apiKey, setApiKeyState] = useState('');
  const [externalWorkspaceId, setExternalWorkspaceIdState] = useState('');
  const [region, setRegionState] = useState('');
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle');
  const [verifyMessage, setVerifyMessage] = useState<string | undefined>(undefined);
  const lastVerifiedKeyRef = useRef<string | null>(null);

  const invalidateVerify = useCallback(() => {
    setVerifyStatus('idle');
    setVerifyMessage(undefined);
    lastVerifiedKeyRef.current = null;
  }, []);

  const resetCredentials = useCallback(() => {
    setApiKeyState('');
    setExternalWorkspaceIdState('');
    setRegionState('');
    invalidateVerify();
  }, [invalidateVerify]);

  const setApiKey = useCallback(
    (next: string) => {
      setApiKeyState(next);
      invalidateVerify();
    },
    [invalidateVerify]
  );

  const setExternalWorkspaceId = useCallback(
    (next: string) => {
      setExternalWorkspaceIdState(next);
      invalidateVerify();
    },
    [invalidateVerify]
  );

  const setRegion = useCallback(
    (next: string) => {
      setRegionState(next);
      invalidateVerify();
    },
    [invalidateVerify]
  );

  return {
    apiKey,
    externalWorkspaceId,
    region,
    verifyStatus,
    verifyMessage,
    lastVerifiedKeyRef,
    setApiKey,
    setExternalWorkspaceId,
    setRegion,
    setVerifyStatus,
    setVerifyMessage,
    resetCredentials,
  };
}
