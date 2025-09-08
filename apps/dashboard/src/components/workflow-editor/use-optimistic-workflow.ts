import {
  ResourceOriginEnum,
  StepCreateDto,
  StepResponseDto,
  UpdateWorkflowDto,
  WorkflowResponseDto,
} from '@novu/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

export interface OptimisticOperation {
  id: string;
  type: 'add' | 'remove' | 'reorder';
  stepSlug?: string;
  previousState: WorkflowResponseDto;
  optimisticState: WorkflowResponseDto;
  timestamp: number;
  tempId?: string;
}

export interface OptimisticStep extends StepResponseDto {
  _optimistic?: {
    isPending: boolean;
    operation: 'add' | 'remove' | 'reorder';
    tempId?: string;
  };
}

interface UseOptimisticWorkflowProps {
  workflow?: WorkflowResponseDto;
  onUpdate: (data: UpdateWorkflowDto, options?: { onSuccess?: (workflow: WorkflowResponseDto) => void }) => void;
}

export function useOptimisticWorkflow({ workflow, onUpdate }: UseOptimisticWorkflowProps) {
  const [optimisticOperations, setOptimisticOperations] = useState<OptimisticOperation[]>([]);
  const operationIdRef = useRef(0);

  const generateOperationId = useCallback(() => {
    operationIdRef.current += 1;
    return `opt_${Date.now()}_${operationIdRef.current}`;
  }, []);

  const generateTempId = useCallback(() => {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const optimisticWorkflow = useMemo(() => {
    if (!workflow) return undefined;

    // If no pending operations, return the real workflow
    if (optimisticOperations.length === 0) {
      return workflow;
    }

    // Start with the real workflow as base
    let result = { ...workflow, steps: [...workflow.steps] };

    // Apply only the operations that are still pending
    for (const operation of optimisticOperations) {
      if (operation.type === 'add' && operation.tempId) {
        // For add operations, only show optimistic step if backend hasn't returned the real one yet
        // We check if there's a new step in the workflow that wasn't there before
        const wasStepAdded = workflow.steps.length > operation.previousState.steps.length;
        if (!wasStepAdded) {
          // Backend hasn't added the step yet, keep showing the optimistic one
          result = operation.optimisticState;
        }
        // If backend has added the step, we use the real workflow data (no flicker)
      } else {
        // For remove/reorder operations, apply the optimistic state
        result = operation.optimisticState;
      }
    }

    return result;
  }, [workflow, optimisticOperations]);

  const addOptimisticOperation = useCallback(
    (operation: Omit<OptimisticOperation, 'id' | 'timestamp'>) => {
      const newOperation: OptimisticOperation = {
        ...operation,
        id: generateOperationId(),
        timestamp: Date.now(),
      };

      setOptimisticOperations((prev) => [...prev, newOperation]);
      return newOperation;
    },
    [generateOperationId]
  );

  const removeOptimisticOperation = useCallback((operationId: string) => {
    setOptimisticOperations((prev) => prev.filter((op) => op.id !== operationId));
  }, []);

  const rollbackOperation = useCallback(
    (operationId: string) => {
      const operation = optimisticOperations.find((op) => op.id === operationId);
      if (operation) {
        removeOptimisticOperation(operationId);
        toast.error(`Failed to ${operation.type} step. Please try again.`);
      }
    },
    [optimisticOperations, removeOptimisticOperation]
  );

  const optimisticAddStep = useCallback(
    (
      _stepType: string,
      insertIndex: number,
      createStepFn: () => StepCreateDto,
      options?: { onSuccess?: (workflow: WorkflowResponseDto) => void }
    ) => {
      if (!workflow) return;

      const tempId = generateTempId();
      const newStep = createStepFn();
      const tempStep = {
        ...newStep,
        slug: tempId,
        _id: tempId,
        stepId: tempId,
        controls: {
          values: newStep.controlValues || {},
        },
        variables: {},
        origin: ResourceOriginEnum.NOVU_CLOUD,
        workflowId: workflow._id,
        workflowDatabaseId: workflow._id,
        _optimistic: {
          isPending: true,
          operation: 'add' as const,
          tempId,
        },
      } as OptimisticStep;

      const optimisticState = {
        ...workflow,
        steps: [
          ...workflow.steps.slice(0, insertIndex),
          tempStep as StepResponseDto,
          ...workflow.steps.slice(insertIndex),
        ],
      };

      const operation = addOptimisticOperation({
        type: 'add',
        stepSlug: tempId,
        previousState: workflow,
        optimisticState,
        tempId,
      });

      const updateSteps = [
        ...workflow.steps.slice(0, insertIndex).map((step) => ({
          _id: step._id,
          stepId: step.stepId,
          name: step.name,
          type: step.type,
          controlValues: step.controlValues,
        })),
        newStep,
        ...workflow.steps.slice(insertIndex).map((step) => ({
          _id: step._id,
          stepId: step.stepId,
          name: step.name,
          type: step.type,
          controlValues: step.controlValues,
        })),
      ];

      onUpdate(
        {
          ...workflow,
          steps: updateSteps,
        },
        {
          onSuccess: (updatedWorkflow) => {
            removeOptimisticOperation(operation.id);
            options?.onSuccess?.(updatedWorkflow);
          },
        }
      );

      return operation;
    },
    [workflow, generateTempId, addOptimisticOperation, onUpdate, removeOptimisticOperation]
  );

  const optimisticRemoveStep = useCallback(
    (stepSlug: string, options?: { onSuccess?: () => void }) => {
      if (!workflow) return;

      const stepIndex = workflow.steps.findIndex((s) => s.slug === stepSlug);
      if (stepIndex === -1) return;

      const optimisticState = {
        ...workflow,
        steps: workflow.steps.map((step) =>
          step.slug === stepSlug
            ? ({
                ...step,
                _optimistic: {
                  isPending: true,
                  operation: 'remove' as const,
                },
              } as OptimisticStep)
            : step
        ),
      };

      const operation = addOptimisticOperation({
        type: 'remove',
        stepSlug,
        previousState: workflow,
        optimisticState,
      });

      onUpdate(
        {
          ...workflow,
          steps: workflow.steps.filter((s) => s.slug !== stepSlug),
        },
        {
          onSuccess: () => {
            removeOptimisticOperation(operation.id);
            options?.onSuccess?.();
          },
        }
      );

      return operation;
    },
    [workflow, addOptimisticOperation, onUpdate, removeOptimisticOperation]
  );

  const optimisticReorderSteps = useCallback(
    (newSteps: StepResponseDto[], options?: { onSuccess?: (workflow: WorkflowResponseDto) => void }) => {
      if (!workflow) return;

      const optimisticState = {
        ...workflow,
        steps: newSteps.map((step) => ({
          ...step,
          _optimistic: {
            isPending: true,
            operation: 'reorder' as const,
          },
        })) as OptimisticStep[],
      };

      const operation = addOptimisticOperation({
        type: 'reorder',
        previousState: workflow,
        optimisticState,
      });

      onUpdate(
        {
          ...workflow,
          steps: newSteps,
        },
        {
          onSuccess: (updatedWorkflow) => {
            removeOptimisticOperation(operation.id);
            options?.onSuccess?.(updatedWorkflow);
          },
        }
      );

      return operation;
    },
    [workflow, addOptimisticOperation, onUpdate, removeOptimisticOperation]
  );

  // Auto-cleanup optimistic operations when backend data arrives
  useEffect(() => {
    if (!workflow || optimisticOperations.length === 0) return;

    // Check for completed add operations (when backend step count increased)
    const completedOperations = optimisticOperations.filter((operation) => {
      if (operation.type === 'add') {
        return workflow.steps.length > operation.previousState.steps.length;
      }
      return false;
    });

    // Remove completed operations to prevent flicker
    if (completedOperations.length > 0) {
      setOptimisticOperations((prev) =>
        prev.filter((op) => !completedOperations.some((completed) => completed.id === op.id))
      );
    }
  }, [workflow, optimisticOperations]);

  const hasPendingOperations = optimisticOperations.length > 0;

  return {
    optimisticWorkflow,
    optimisticAddStep,
    optimisticRemoveStep,
    optimisticReorderSteps,
    hasPendingOperations,
    rollbackOperation,
    pendingOperations: optimisticOperations,
  };
}
