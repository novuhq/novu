import { useMemo } from 'react';
import { INotificationTemplate } from '@novu/shared';

import { useDiscover } from '../studio/hooks';
import { createHash } from '../utils/create-hash';
import { useWorkflows } from './useNovuAPI';

export function useIsSynced() {
  const { data: bridgeDiscoverData, isLoading: isLoadingBridgeWorkflows } = useDiscover();
  const { data: originData, isLoading: isLoadingOriginWorkflows, refetch } = useWorkflows({ page: 0, limit: 100 });

  const isSynced = useMemo(() => {
    if (isLoadingBridgeWorkflows || isLoadingOriginWorkflows) {
      return true;
    }

    const bridgeDiscoverWorkflows =
      bridgeDiscoverData?.workflows.sort((workflowA, workflowB) =>
        workflowA.workflowId.localeCompare(workflowB.workflowId)
      ) || undefined;
    const originWorkflows =
      originData?.data
        .map((workflow: INotificationTemplate) => workflow.rawData)
        .filter((el) => !!el)
        .sort((workflowA, workflowB) => workflowA.workflowId.localeCompare(workflowB.workflowId)) || undefined;

    const bridgeDiscoverWorkflowsHash = createHash(JSON.stringify(bridgeDiscoverWorkflows || ''));
    const storedWorkflowsHash = createHash(JSON.stringify(originWorkflows || ''));

    return storedWorkflowsHash === bridgeDiscoverWorkflowsHash;
  }, [bridgeDiscoverData, originData, isLoadingBridgeWorkflows, isLoadingOriginWorkflows]);

  return { isSynced, refetchOriginWorkflows: refetch };
}
