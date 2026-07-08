import type { JSONSchemaDto, WorkflowTestDataResponseDto } from '@novu/shared';
import { useMemo } from 'react';
import { getWorkflowTestData } from '@/api/workflows';
import { useEnvironment } from '@/context/environment/hooks';
import { useLocalMode } from '@/context/local-mode';
import { useLocalOrRemoteData } from '@/hooks/use-local-or-remote-data';
import { getIdFromSlug, WORKFLOW_DIVIDER } from '@/utils/id-utils';
import { findLocalWorkflow } from '@/utils/local-bridge';
import { QueryKeys } from '@/utils/query-keys';

const LOCAL_TO_SCHEMA: JSONSchemaDto = {
  type: 'object',
  properties: {
    subscriberId: { type: 'string' },
  },
  required: ['subscriberId'],
  additionalProperties: false,
};

export const useFetchWorkflowTestData = ({ workflowSlug }: { workflowSlug: string }) => {
  const { currentEnvironment } = useEnvironment();
  const { isLocalRoute, workflows } = useLocalMode();

  const localTestData = useMemo<WorkflowTestDataResponseDto | undefined>(() => {
    if (!isLocalRoute) return undefined;

    const workflow = findLocalWorkflow(workflows, workflowSlug);

    if (!workflow) return undefined;

    return {
      to: LOCAL_TO_SCHEMA,
      payload: (workflow.payloadSchema ?? { type: 'object', additionalProperties: true }) as JSONSchemaDto,
    };
  }, [isLocalRoute, workflows, workflowSlug]);

  const { data, isPending, error } = useLocalOrRemoteData({
    isLocalRoute,
    localData: localTestData,
    localIsPending: !localTestData,
    queryKey: [
      QueryKeys.fetchWorkflowTestData,
      currentEnvironment?._id,
      getIdFromSlug({ slug: workflowSlug, divider: WORKFLOW_DIVIDER }),
    ],
    queryFn: () => getWorkflowTestData({ environment: currentEnvironment!, workflowSlug }),
    enabled: !!currentEnvironment?._id && !!workflowSlug,
    gcTime: 0,
  });

  return {
    testData: data,
    isPending,
    error,
  };
};
