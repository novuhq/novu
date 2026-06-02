import { PatchWorkflowDto, StepCreateDto, StepResponseDto, UpdateWorkflowDto, WorkflowResponseDto } from '@novu/shared';
import { Cross2Icon } from '@radix-ui/react-icons';
import { QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
import { CheckCircleIcon } from 'lucide-react';
import { createContext, ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { RiAlertFill } from 'react-icons/ri';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/primitives/dialog';
import { useEnvironment } from '@/context/environment/hooks';
import { useBeforeUnload } from '@/hooks/use-before-unload';
import { useDataRef } from '@/hooks/use-data-ref';
import { useFetchWorkflow } from '@/hooks/use-fetch-workflow';
import { useInvocationQueue } from '@/hooks/use-invocation-queue';
import { usePatchWorkflow } from '@/hooks/use-patch-workflow';
import { useUpdateWorkflow } from '@/hooks/use-update-workflow';
import { createContextHook } from '@/utils/context';
import { getIdFromSlug, STEP_DIVIDER } from '@/utils/id-utils';
import { buildRoute, ROUTES } from '@/utils/routes';
import { showErrorToast } from './toasts';
import { WorkflowSchemaProvider } from './workflow-schema-provider';

export type DraftStep = StepCreateDto & {
  stepId: string;
};

export type UpdateWorkflowFn = (
  data: UpdateWorkflowDto,
  options?: {
    onSuccess?: (workflow: WorkflowResponseDto) => void;
    onError?: (error: unknown) => void;
  }
) => void;

export type WorkflowContextType = {
  isPending: boolean;
  isUpdatePatchPending: boolean;
  workflow?: WorkflowResponseDto;
  step?: StepResponseDto;
  refetch: (options?: RefetchOptions) => Promise<QueryObserverResult<WorkflowResponseDto, Error>>;
  update: UpdateWorkflowFn;
  patch: (data: PatchWorkflowDto) => void;
  digestStepBeforeCurrent?: StepResponseDto;
  lastSaveError: unknown | null;
};

const WorkflowContext = createContext<WorkflowContextType>({} as WorkflowContextType);

export const WorkflowProvider = ({ children }: { children: ReactNode }) => {
  const { currentEnvironment } = useEnvironment();
  const { workflowSlug = '', stepSlug = '' } = useParams<{ workflowSlug?: string; stepSlug?: string }>();
  const navigate = useNavigate();
  const [lastSaveError, setLastSaveError] = useState<unknown | null>(null);

  const { workflow, isPending, error, refetch } = useFetchWorkflow({
    workflowSlug: workflowSlug !== 'new' ? workflowSlug : undefined,
  });
  const workflowRef = useDataRef<WorkflowResponseDto | undefined>(workflow);

  const getStep = useCallback(() => {
    return workflow?.steps.find(
      (step) =>
        getIdFromSlug({ slug: stepSlug, divider: STEP_DIVIDER }) ===
        getIdFromSlug({ slug: step.slug, divider: STEP_DIVIDER })
    );
  }, [workflow, stepSlug]);

  const isStepAfterDigest = useMemo(() => {
    const step = getStep();
    if (!step) return false;

    const index = workflow?.steps.findIndex(
      (current) =>
        getIdFromSlug({ slug: current.slug, divider: STEP_DIVIDER }) ===
        getIdFromSlug({ slug: step.slug, divider: STEP_DIVIDER })
    );
    /**
     * < 1 means that the step is the first step in the workflow
     */
    if (index === undefined || index < 1) return false;

    const hasDigestStepInBetween = workflow?.steps.slice(0, index).some((s) => s.type === 'digest');

    return Boolean(hasDigestStepInBetween);
  }, [getStep, workflow?.steps]);

  const digestStepBeforeCurrent = useMemo(() => {
    if (!workflow || !isStepAfterDigest) return undefined;

    const index = workflow.steps.findIndex(
      (step) =>
        getIdFromSlug({ slug: stepSlug, divider: STEP_DIVIDER }) ===
        getIdFromSlug({ slug: step.slug, divider: STEP_DIVIDER })
    );

    if (index === -1) return undefined;

    const stepsBeforeCurrent = workflow.steps.slice(0, index);

    const digestStep = stepsBeforeCurrent.reverse().find((step) => step.type === 'digest');

    return digestStep;
  }, [workflow, isStepAfterDigest, stepSlug]);

  const { enqueue, hasPendingItems } = useInvocationQueue();

  const { patchWorkflow, isPending: isPatchPending } = usePatchWorkflow({
    onMutate: () => {
      // Clear error state when a new save starts
      setLastSaveError(null);
    },
    onError: (error) => {
      setLastSaveError(error);
      showErrorToast(undefined, error);
    },
    onSuccess: () => {
      setLastSaveError(null);
    },
  });

  const { updateWorkflow, isPending: isUpdatePending } = useUpdateWorkflow({
    onMutate: () => {
      // Clear error state when a new save starts
      setLastSaveError(null);
    },
    onError: (error) => {
      setLastSaveError(error);
      showErrorToast(undefined, error);
    },
    onSuccess: () => {
      setLastSaveError(null);
    },
  });

  const update = useCallback(
    (
      data: UpdateWorkflowDto,
      options?: { onSuccess?: (workflow: WorkflowResponseDto) => void; onError?: (error: unknown) => void }
    ) => {
      const currentWorkflow = workflowRef.current;
      if (currentWorkflow) {
        enqueue(async () => {
          try {
            const res = await updateWorkflow({ workflowSlug: currentWorkflow.slug, workflow: { ...data } });
            options?.onSuccess?.(res);
          } catch (error) {
            setLastSaveError(error);
            options?.onError?.(error);
            showErrorToast(undefined, error);
          }
        });
      }
    },
    [enqueue, updateWorkflow, workflowRef]
  );

  const isUpdatePatchPending = isPatchPending || isUpdatePending || hasPendingItems;

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

  /**
   * Prevents the user from accidentally closing the tab or window
   * while an update is in progress.
   */
  useBeforeUnload(isUpdatePatchPending);

  const patch = useCallback(
    (data: PatchWorkflowDto) => {
      const currentWorkflow = workflowRef.current;
      if (currentWorkflow) {
        enqueue(() => patchWorkflow({ workflowSlug: currentWorkflow.slug, workflow: { ...data } }));
      }
    },
    [enqueue, patchWorkflow, workflowRef]
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
      const timer = setTimeout(() => {
        if (blocker.state === 'blocked') {
          blocker.proceed?.();
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isAllowedToUnblock, blocker]);

  const value = useMemo(
    () => ({
      refetch,
      update,
      patch,
      isPending,
      workflow,
      step: getStep(),
      digestStepBeforeCurrent,
      isUpdatePatchPending,
      lastSaveError,
    }),
    [refetch, update, patch, isPending, workflow, getStep, digestStepBeforeCurrent, isUpdatePatchPending, lastSaveError]
  );

  return (
    <>
      <SavingChangesDialog
        isOpen={blocker.state === 'blocked'}
        isUpdatePatchPending={isUpdatePatchPending}
        onCancel={handleCancelNavigation}
      />
      <WorkflowContext.Provider value={value}>
        <WorkflowSchemaProvider>{children}</WorkflowSchemaProvider>
      </WorkflowContext.Provider>
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
    <Dialog modal open={isOpen} onOpenChange={(open) => !open && isUpdatePatchPending && onCancel()}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-w-[440px] gap-4 rounded-xl! p-4 overflow-hidden" hideCloseButton>
          <div className="flex items-start justify-between">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
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
            {isUpdatePatchPending && (
              <DialogClose>
                <Cross2Icon className="size-4" />
                <span className="sr-only">Close</span>
              </DialogClose>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <DialogTitle className="text-md font-medium transition-all duration-300">
              {isUpdatePatchPending ? 'Saving changes' : 'Changes saved!'}
            </DialogTitle>
            <DialogDescription className="text-foreground-600 transition-all duration-300">
              {isUpdatePatchPending ? 'Please wait while we save your changes' : 'Workflow has been saved successfully'}
            </DialogDescription>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export const useWorkflow = createContextHook(WorkflowContext);
