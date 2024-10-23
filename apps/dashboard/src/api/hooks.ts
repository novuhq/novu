import { getV2 } from '@/api/api.client';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { ListWorkflowResponse, WorkflowResponseDto } from '@novu/shared';
import { QueryFunction, QueryKey, useQuery, UseQueryResult, UseQueryOptions } from '@tanstack/react-query';

interface QueryInputMap {
  fetchWorkflow: { workflowId?: string };
  fetchWorkflows: { limit: number; offset: number };
}

interface QueryResponseMap {
  fetchWorkflow: { data: WorkflowResponseDto };
  fetchWorkflows: { data: ListWorkflowResponse };
}

type Context = {
  environmentId?: string;
};

const queryData: {
  [K in keyof QueryInputMap]: (props: { input: QueryInputMap[K]; ctx: Context }) => {
    queryFn: QueryFunction<QueryResponseMap[K]>;
    queryKey: QueryKey;
    enabled?: boolean;
  };
} = {
  fetchWorkflow: (props) => ({
    queryFn: () => getV2<QueryResponseMap['fetchWorkflow']>(`/workflows/${props.input.workflowId}`),
    queryKey: [QueryKeys.fetchWorkflow, props.ctx.environmentId, props.input.workflowId],
    enabled: !!props.ctx.environmentId && !!props.input.workflowId,
  }),
  fetchWorkflows: (props) => ({
    queryFn: () =>
      getV2<QueryResponseMap['fetchWorkflows']>(`/workflows?limit=${props.input.limit}&offset=${props.input.offset}`),
    queryKey: [QueryKeys.fetchWorkflows, props.ctx.environmentId, props.input.limit, props.input.offset],
    enabled: !!props.ctx.environmentId,
  }),
};

type UseQueryParams<K extends keyof QueryInputMap> = QueryInputMap[K] &
  Partial<Omit<UseQueryOptions<QueryResponseMap[K], unknown>, keyof QueryInputMap[K]>>;

const createUseQuery = <K extends keyof QueryInputMap>(key: K) => {
  return (params: UseQueryParams<K>): UseQueryResult<QueryResponseMap[K]> => {
    const { currentEnvironment } = useEnvironment();

    const { queryFn, queryKey, enabled } = queryData[key]({
      ctx: { environmentId: currentEnvironment?._id },
      input: params,
    });

    return useQuery<QueryResponseMap[K]>({
      queryKey,
      queryFn,
      enabled,
      ...params,
    });
  };
};

export const api = Object.fromEntries(
  (Object.keys(queryData) as Array<keyof QueryInputMap>).map((key) => [key, { useQuery: createUseQuery(key) }])
) as {
  [K in keyof QueryInputMap]: {
    useQuery: (params: UseQueryParams<K>) => UseQueryResult<QueryResponseMap[K]>;
  };
};
