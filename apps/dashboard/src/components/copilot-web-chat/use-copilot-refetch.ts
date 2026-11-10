import type { AgentEventEnvelope } from '@novu/js';
import { COPILOT_WORKFLOW_UPDATED_EVENT } from '@novu/shared';
import { type MutableRefObject, useCallback, useRef } from 'react';
import { isWorkflowWriteTool } from './copilot-web-chat-utils';

type OnRefetchRef = MutableRefObject<(() => void) | undefined>;

function readWorkflowUpdate(data: unknown): { workflowId?: string; deleted: boolean } {
  if (typeof data !== 'object' || data === null) return { deleted: false };

  const { workflowId, deleted } = data as { workflowId?: unknown; deleted?: unknown };

  return { workflowId: typeof workflowId === 'string' ? workflowId : undefined, deleted: deleted === true };
}

/**
 * Returns an `onEvent` handler for `useWebChat` that refetches the workflow after the agent
 * successfully applies a workflow write tool or reports a workflow update, and once more when the run finishes.
 * When the agent reports it deleted a workflow, `onWorkflowDeleted` runs instead of the refetch and returns
 * whether the editor was showing it and left it.
 */
export function useCopilotRefetch(
  onRefetchRef: OnRefetchRef,
  onRunEvent?: (envelope: AgentEventEnvelope) => void,
  onWorkflowDeleted?: (workflowId: string) => boolean
) {
  const toolNamesRef = useRef(new Map<string, string>());
  const hasLeftDeletedWorkflowRef = useRef(false);
  const onRunEventRef = useRef(onRunEvent);
  onRunEventRef.current = onRunEvent;
  const onWorkflowDeletedRef = useRef(onWorkflowDeleted);
  onWorkflowDeletedRef.current = onWorkflowDeleted;

  return useCallback(
    (envelope: AgentEventEnvelope) => {
      const { event } = envelope;

      if (event.type === 'custom' && event.name === COPILOT_WORKFLOW_UPDATED_EVENT) {
        const { workflowId, deleted } = readWorkflowUpdate(event.data);

        if (deleted && workflowId && onWorkflowDeletedRef.current?.(workflowId)) {
          hasLeftDeletedWorkflowRef.current = true;
        } else {
          onRefetchRef.current?.();
        }
      } else if (event.type === 'tool-use-start') {
        toolNamesRef.current.set(event.toolUseId, event.toolName);
      } else if (event.type === 'tool-use-result') {
        const toolName = toolNamesRef.current.get(event.toolUseId);

        if (toolName && !event.isError && isWorkflowWriteTool(toolName)) {
          onRefetchRef.current?.();
        }
      } else if (event.type === 'run-finish' || event.type === 'run-error') {
        toolNamesRef.current.clear();

        // The deleted workflow cannot be fetched anymore, so the final refetch is skipped once the editor left it.
        if (event.type === 'run-finish' && !hasLeftDeletedWorkflowRef.current) {
          onRefetchRef.current?.();
        }

        hasLeftDeletedWorkflowRef.current = false;
      }

      onRunEventRef.current?.(envelope);
    },
    [onRefetchRef]
  );
}
