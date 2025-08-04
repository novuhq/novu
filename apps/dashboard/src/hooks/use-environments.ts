import { IEnvironment } from '@novu/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createEnvironment,
  deleteEnvironment,
  diffEnvironments,
  type IEnvironmentDiffResponse,
  type IEnvironmentPublishResponse,
  publishEnvironments,
  type ResourceToPublish,
  updateEnvironment,
} from '@/api/environments';
import { QueryKeys } from '@/utils/query-keys';

export function useCreateEnvironment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEnvironment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.myEnvironments] });
    },
  });
}

export function useUpdateEnvironment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateEnvironment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.myEnvironments] });
    },
  });
}

export function useDeleteEnvironment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ environment }: { environment: IEnvironment }) => deleteEnvironment({ environment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.myEnvironments] });
    },
  });
}

export const useDiffEnvironments = ({
  sourceEnvironmentId,
  targetEnvironmentId,
  enabled = true,
}: {
  sourceEnvironmentId?: string;
  targetEnvironmentId?: string;
  enabled?: boolean;
}) => {
  return useQuery<IEnvironmentDiffResponse>({
    queryKey: [QueryKeys.diffEnvironments, sourceEnvironmentId, targetEnvironmentId],
    queryFn: () =>
      diffEnvironments({ sourceEnvironmentId: sourceEnvironmentId!, targetEnvironmentId: targetEnvironmentId! }),
    enabled: enabled && !!sourceEnvironmentId && !!targetEnvironmentId && sourceEnvironmentId !== targetEnvironmentId,
    staleTime: 2 * 60 * 1000, // 2 minutes - prevent constant refetching
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
  });
};

export const usePublishEnvironments = () => {
  const queryClient = useQueryClient();

  return useMutation<
    IEnvironmentPublishResponse,
    Error,
    {
      sourceEnvironmentId: string;
      targetEnvironmentId: string;
      resources?: ResourceToPublish[];
    }
  >({
    mutationFn: publishEnvironments,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.diffEnvironments] });
    },
  });
};
