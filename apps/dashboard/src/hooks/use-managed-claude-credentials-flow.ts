import { useCallback, useRef, useState } from 'react';

import type { VerifyStatus } from '@/components/agents/create-agent-fields';

export function useManagedClaudeCredentialsFlow() {
  const [apiKey, setApiKeyState] = useState('');
  const [externalWorkspaceId, setExternalWorkspaceIdState] = useState('');
  const [region, setRegionState] = useState('');
  const [projectName, setProjectNameState] = useState('');
  const [instanceId, setInstanceIdState] = useState('');
  const [agentId, setAgentIdState] = useState('');
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
    setProjectNameState('');
    setInstanceIdState('');
    setAgentIdState('');
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

  const setProjectName = useCallback(
    (next: string) => {
      setProjectNameState(next);
      invalidateVerify();
    },
    [invalidateVerify]
  );

  const setInstanceId = useCallback(
    (next: string) => {
      setInstanceIdState(next);
      invalidateVerify();
    },
    [invalidateVerify]
  );

  // Agent ID doesn't affect credential verification (project + engine only), so changing it
  // doesn't invalidate the verify status.
  const setAgentId = useCallback((next: string) => {
    setAgentIdState(next);
  }, []);

  return {
    apiKey,
    externalWorkspaceId,
    region,
    projectName,
    instanceId,
    agentId,
    verifyStatus,
    verifyMessage,
    lastVerifiedKeyRef,
    setApiKey,
    setExternalWorkspaceId,
    setRegion,
    setProjectName,
    setInstanceId,
    setAgentId,
    setVerifyStatus,
    setVerifyMessage,
    resetCredentials,
  };
}
