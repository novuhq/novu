import { getV2, NovuApiError } from '@/api/api.client';
import { syncWorkflow } from '@/api/workflows';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { ToastIcon } from '@/components/primitives/sonner';
import { showToast } from '@/components/primitives/sonner-helpers';
import { SuccessButtonToast } from '@/components/success-button-toast';
import TruncatedText from '@/components/truncated-text';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment, useFetchEnvironments } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';
import type { IEnvironment, WorkflowListResponseDto, WorkflowResponseDto } from '@novu/shared';
import { WorkflowOriginEnum, WorkflowStatusEnum } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function useSyncWorkflow(workflow: WorkflowResponseDto | WorkflowListResponseDto) {
  const { currentEnvironment } = useEnvironment();
  const { currentOrganization } = useAuth();
  const { environments = [] } = useFetchEnvironments({ organizationId: currentOrganization?._id });
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [targetEnvironmentId, setTargetEnvironmentId] = useState<string>();
  const navigate = useNavigate();

  let loadingToast: string | number | undefined = undefined;

  const isSyncable = useMemo(
    () => workflow.origin === WorkflowOriginEnum.NOVU_CLOUD && workflow.status !== WorkflowStatusEnum.ERROR,
    [workflow.origin, workflow.status]
  );

  const getTooltipContent = () => {
    if (workflow.origin === WorkflowOriginEnum.EXTERNAL) {
      return 'Code-first workflows cannot be synced using dashboard.';
    }

    if (workflow.origin === WorkflowOriginEnum.NOVU_CLOUD_V1) {
      return 'V1 workflows cannot be synced using dashboard. Please visit the legacy portal.';
    }

    if (workflow.status === WorkflowStatusEnum.ERROR) {
      return 'This workflow has errors and cannot be synced. Please fix the errors first.';
    }
  };

  const safeSync = async (envId: string) => {
    try {
      setTargetEnvironmentId(envId);
      if (await isWorkflowInTargetEnvironment(envId)) {
        setShowConfirmModal(true);

        return;
      }
    } catch (error) {
      if (error instanceof NovuApiError && error.status === 404) {
        await syncWorkflowMutation(envId);

        return;
      }

      toast.error('Failed to sync workflow', {
        description: error instanceof Error ? error.message : 'There was an error syncing the workflow.',
      });
    }
  };

  const onSyncSuccess = (workflow: WorkflowResponseDto, environment?: IEnvironment) => {
    toast.dismiss(loadingToast);
    setIsLoading(false);

    return showToast({
      variant: 'lg',
      className: 'gap-3',
      children: ({ close }) => (
        <SuccessButtonToast
          title={`Workflow synced to ${environment?.name}`}
          description={
            <>
              Workflow <span className="font-bold">{workflow.name}</span> has been successfully synced to{' '}
              {environment?.name}.
            </>
          }
          actionLabel={`Switch to ${environment?.name}`}
          onAction={() => {
            close();
            const targetSlug = environment?.slug || '';

            navigate(buildRoute(ROUTES.WORKFLOWS, { environmentSlug: targetSlug }));
          }}
          onClose={close}
        />
      ),
      options: {
        position: 'bottom-right',
      },
    });
  };

  const onSyncError = (error: unknown) => {
    toast.dismiss(loadingToast);
    setIsLoading(false);

    toast.error('Failed to sync workflow', {
      description: error instanceof Error ? error.message : 'There was an error syncing the workflow.',
    });
  };

  const { mutateAsync: syncWorkflowMutation, isPending } = useMutation({
    mutationFn: async (targetEnvId: string) => {
      const targetEnvironment = environments.find((env) => env._id === targetEnvId);

      return syncWorkflow({
        environment: currentEnvironment!,
        workflowSlug: workflow.slug,
        payload: { targetEnvironmentId: targetEnvId },
      }).then((res) => ({ workflow: res.data, environment: targetEnvironment }));
    },
    onMutate: async (targetEnvId) => {
      const targetEnvironment = environments.find((env) => env._id === targetEnvId);
      setIsLoading(true);
      loadingToast = toast.loading(
        <>
          <ToastIcon variant="default" className="animate-spin" />
          <span className="text-sm">
            Syncing workflow <span className="font-bold">{workflow.name}</span> to {targetEnvironment?.name}...
          </span>
        </>
      );
    },
    onSuccess: ({ workflow, environment }) => onSyncSuccess(workflow, environment),
    onError: onSyncError,
  });

  const { mutateAsync: isWorkflowInTargetEnvironment } = useMutation({
    mutationFn: async (targetEnvId: string) => {
      const { data } = await getV2<{ data: WorkflowResponseDto }>(
        `/workflows/${workflow.workflowId}?environmentId=${targetEnvId}`,
        { environment: currentEnvironment! }
      );
      return data;
    },
  });

  return {
    safeSync,
    sync: syncWorkflowMutation,
    isSyncable,
    isLoading,
    tooltipContent: getTooltipContent(),
    PromoteConfirmModal: () => {
      const targetEnvironment = environments.find((env) => env._id === targetEnvironmentId);

      return (
        <ConfirmationModal
          open={showConfirmModal}
          onOpenChange={setShowConfirmModal}
          onConfirm={() => {
            if (targetEnvironmentId) {
              syncWorkflowMutation(targetEnvironmentId);
              setShowConfirmModal(false);
            }
          }}
          title={`Sync workflow to ${targetEnvironment?.name}`}
          description={
            <>
              Workflow <TruncatedText className="max-w-[32ch] font-bold">{workflow.name}</TruncatedText> already exists
              in {targetEnvironment?.name}.<br />
              <br />
              Proceeding will overwrite the existing workflow.
            </>
          }
          confirmButtonText="Proceed"
          isLoading={isPending}
        />
      );
    },
  };
}
