import { PatchWorkflowDto, StepResponseDto, UpdateWorkflowDto, WorkflowResponseDto } from '@novu/shared';
import { createContext, ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/primitives/alert-dialog';
import { useEnvironment } from '@/context/environment/hooks';
import { useBeforeUnload } from '@/hooks/use-before-unload';
import { useFetchWorkflow } from '@/hooks/use-fetch-workflow';
import { useInvocationQueue } from '@/hooks/use-invocation-queue';
import { usePatchWorkflow } from '@/hooks/use-patch-workflow';
import { useUpdateWorkflow } from '@/hooks/use-update-workflow';
import { createContextHook } from '@/utils/context';
import { buildRoute, ROUTES } from '@/utils/routes';
import { getWorkflowIdFromSlug, STEP_DIVIDER } from '@/utils/step';
import { CheckCircleIcon } from 'lucide-react';
import { RiAlertFill, RiCloseFill } from 'react-icons/ri';
import { toast } from 'sonner';
import { showErrorToast, showSavingToast, showSuccessToast } from './toasts';

export type UpdateWorkflowFn = (
  data: UpdateWorkflowDto,
  options?: {
    onSuccess?: (workflow: WorkflowResponseDto) => void;
  }
) => void;

export type WorkflowContextType = {
  isPending: boolean;
  workflow?: WorkflowResponseDto;
  step?: StepResponseDto;
  update: UpdateWorkflowFn;
  patch: (data: PatchWorkflowDto) => void;
};

export const WorkflowContext = createContext<WorkflowContextType>({} as WorkflowContextType);

export const WorkflowProvider = ({ children }: { children: ReactNode }) => {
  const { currentEnvironment } = useEnvironment();
  const { workflowSlug = '', stepSlug = '' } = useParams<{ workflowSlug?: string; stepSlug?: string }>();
  const [toastId, setToastId] = useState<string | number>('');
  const navigate = useNavigate();

  const { workflow, isPending, error } = useFetchWorkflow({
    workflowSlug,
  });

  const getStep = useCallback(() => {
    return workflow?.steps.find(
      (step) =>
        getWorkflowIdFromSlug({ slug: stepSlug, divider: STEP_DIVIDER }) ===
        getWorkflowIdFromSlug({ slug: step.slug, divider: STEP_DIVIDER })
    );
  }, [workflow, stepSlug]);

  const { enqueue, hasPendingItems } = useInvocationQueue();
  const blocker = useBlocker(({ nextLocation }) => {
    const workflowEditorBasePath = buildRoute(ROUTES.EDIT_WORKFLOW, {
      workflowSlug,
      environmentSlug: currentEnvironment?.slug ?? '',
    });

    const isLeavingEditor = !nextLocation.pathname.startsWith(workflowEditorBasePath);

    return isLeavingEditor && isUpdatePatchPending;
  });
  const isBlocked = blocker.state === 'blocked';
  const isAllowedToUnblock = isBlocked && !hasPendingItems;

  const { patchWorkflow, isPending: isPatchPending } = usePatchWorkflow({
    onMutate: () => {
      // when the navigation is blocked, we don't want to show the toast
      if (!isBlocked) {
        showSavingToast(setToastId);
      }
    },
    onSuccess: async () => {
      // when the navigation is blocked, we don't want to show the toast
      if (!isBlocked) {
        showSuccessToast(toastId);
      }
    },
    onError: () => {
      showErrorToast(toastId);
    },
  });

  const { updateWorkflow, isPending: isUpdatePending } = useUpdateWorkflow({
    onMutate: () => {
      // when the navigation is blocked, we don't want to show the toast
      if (!isBlocked) {
        showSavingToast(setToastId);
      }
    },
    onSuccess: async () => {
      // when the navigation is blocked, we don't want to show the toast
      if (!isBlocked) {
        showSuccessToast(toastId);
      }
    },
    onError: () => {
      showErrorToast(toastId);
    },
  });

  const isUpdatePatchPending = isPatchPending || isUpdatePending || hasPendingItems;
  /**
   * Prevents the user from accidentally closing the tab or window
   * while an update is in progress.
   */
  useBeforeUnload(isUpdatePatchPending);

  const update = useCallback(
    (data: UpdateWorkflowDto, options?: { onSuccess?: (workflow: WorkflowResponseDto) => void }) => {
      if (workflow) {
        enqueue(async () => {
          const res = await updateWorkflow({ workflowSlug: workflow.slug, workflow: { ...data } });
          options?.onSuccess?.(res);
          return res;
        });
      }
    },
    [enqueue, updateWorkflow, workflow]
  );

  const patch = useCallback(
    (data: PatchWorkflowDto) => {
      if (workflow) {
        enqueue(() => patchWorkflow({ workflowSlug: workflow.slug, workflow: { ...data } }));
      }
    },
    [enqueue, patchWorkflow, workflow]
  );

  useLayoutEffect(() => {
    if (error) {
      navigate(buildRoute(ROUTES.WORKFLOWS, { environmentSlug: currentEnvironment?.slug ?? '' }));
    }

    if (!workflow) {
      return;
    }
  }, [workflow, error, navigate, currentEnvironment]);

  const handleCancelNavigation = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);

  /*
   * If there was a pending navigation when saving was in progress,
   * proceed with that navigation now that changes are saved
   *
   * small timeout to briefly show the success dialog before navigating
   */
  useEffect(() => {
    if (isAllowedToUnblock) {
      toast.dismiss();
      setTimeout(() => {
        blocker.proceed?.();
      }, 500);
    }
  }, [isAllowedToUnblock, blocker]);

  const value = useMemo(
    () => ({ update, patch, isPending, workflow, step: getStep() }),
    [update, patch, isPending, workflow, getStep]
  );

  return (
    <>
      <SavingChangesDialog
        isOpen={blocker.state === 'blocked'}
        isUpdatePatchPending={isUpdatePatchPending}
        onCancel={handleCancelNavigation}
      />
      <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>
    </>
  );
};

const SavingChangesDialog = ({
  isOpen,
  isUpdatePatchPending,
  onCancel,
}: {
  isOpen: boolean;
  isUpdatePatchPending: boolean;
  onCancel: () => void;
}) => {
  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="w-[26rem]">
        <AlertDialogHeader className="flex flex-row items-start gap-4">
          <div
            className={`rounded-lg p-3 transition-all duration-300 ${
              isUpdatePatchPending ? 'bg-warning/10' : 'bg-success/10 scale-110'
            }`}
          >
            <div className="transition-opacity duration-300">
              {isUpdatePatchPending ? (
                <RiAlertFill className="text-warning animate-in fade-in size-6" />
              ) : (
                <CheckCircleIcon className="text-success animate-in fade-in size-6" />
              )}
            </div>
          </div>
          <div className="space-y-1">
            <div>
              <AlertDialogTitle className="transition-all duration-300">
                {isUpdatePatchPending ? 'Saving changes' : 'Changes saved!'}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="transition-all duration-300">
              {isUpdatePatchPending ? 'Please wait while we save your changes' : 'Workflow has been saved successfully'}
            </AlertDialogDescription>
          </div>
          {isUpdatePatchPending && (
            <button onClick={onCancel} className="text-gray-500">
              <RiCloseFill className="size-4" />
            </button>
          )}
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const useWorkflow = createContextHook(WorkflowContext);
