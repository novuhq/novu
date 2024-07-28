import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { INotificationTemplate } from '@novu/shared';

import { getNotificationsList } from '../api/notification-templates';
import { useDiscover } from '../studio/hooks';
import { createHash } from '../utils/create-hash';

export function useIsSynced() {
  const { data: bridgeDiscoverData, isLoading: isLoadingBridgeWorkflows } = useDiscover();
  const {
    data: originData,
    isLoading: isLoadingOriginWorkflows,
    refetch,
  } = useQuery(
    ['origin-workflows'],
    async () => {
      return getNotificationsList({ page: 0, limit: 100 });
    },
    {}
  );

  const isSynced = useMemo(() => {
    if (isLoadingBridgeWorkflows || isLoadingOriginWorkflows) {
      return true;
    }

    const bridgeDiscoverWorkflows = bridgeDiscoverData?.workflows || undefined;
    const originWorkflows = originData?.data.map((workflow: INotificationTemplate) => workflow.rawData) || undefined;

    const bridgeDiscoverWorkflowsHash = createHash(JSON.stringify(bridgeDiscoverWorkflows || ''));
    const storedWorkflowsHash = createHash(JSON.stringify(originWorkflows || ''));

    return storedWorkflowsHash === bridgeDiscoverWorkflowsHash;
  }, [bridgeDiscoverData, originData, isLoadingBridgeWorkflows, isLoadingOriginWorkflows]);

  return { isSynced, refetchOriginWorkflows: refetch };
}
