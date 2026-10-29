import type { AgentEventEnvelope } from '@novu/js';
import { type MutableRefObject, useCallback, useRef } from 'react';
import { isWorkflowWriteTool } from './copilot-web-chat-utils';

type OnRefetchRef = MutableRefObject<(() => void) | undefined>;

/**
 * Returns an `onEvent` handler for `useWebChat` that refetches the workflow after the agent
 * successfully applies a workflow write tool, and once more when the run finishes.
 */
export function useCopilotRefetch(onRefetchRef: OnRefetchRef, onRunEvent?: (envelope: AgentEventEnvelope) => void) {
  const toolNamesRef = useRef(new Map<string, string>());
  const onRunEventRef = useRef(onRunEvent);
  onRunEventRef.current = onRunEvent;

  return useCallback(
    (envelope: AgentEventEnvelope) => {
      const { event } = envelope;

      if (event.type === 'tool-use-start') {
        toolNamesRef.current.set(event.toolUseId, event.toolName);
      } else if (event.type === 'tool-use-result') {
        const toolName = toolNamesRef.current.get(event.toolUseId);

        if (toolName && !event.isError && isWorkflowWriteTool(toolName)) {
          onRefetchRef.current?.();
        }
      } else if (event.type === 'run-finish' || event.type === 'run-error') {
        toolNamesRef.current.clear();

        if (event.type === 'run-finish') {
          onRefetchRef.current?.();
        }
      }

      onRunEventRef.current?.(envelope);
    },
    [onRefetchRef]
  );
}
