import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useMutation, UseMutationOptions, useQueryClient } from '@tanstack/react-query';
import { CreateLayoutDto, LayoutResponseDto } from '@novu/shared';

import { createLayout } from '@/api/layouts';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { buildRoute, ROUTES } from '@/utils/routes';
import { showSuccessToast, showErrorToast } from '../components/workflow-editor/toasts';

export function useCreateLayout(options?: UseMutationOptions<LayoutResponseDto, unknown, CreateLayoutDto>) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const [toastId] = useState<string | number>('');

  const mutation = useMutation({
    mutationFn: async (layout: CreateLayoutDto) => createLayout({ environment: currentEnvironment!, layout }),
    onSuccess: async (data, variables, ctx) => {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchLayouts, currentEnvironment?._id] });

      showSuccessToast(toastId);
      navigate(
        buildRoute(ROUTES.LAYOUTS, {
          environmentSlug: currentEnvironment?.slug ?? '',
        })
      );

      options?.onSuccess?.(data, variables, ctx);
    },

    onError: (error, variables, ctx) => {
      showErrorToast(toastId, error);
      options?.onError?.(error, variables, ctx);
    },
  });

  return {
    createLayout: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}
