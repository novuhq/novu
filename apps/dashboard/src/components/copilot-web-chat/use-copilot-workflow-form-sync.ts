import { useContext, useEffect, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import type { workflowSchema } from '@/components/workflow-editor/schema';
import { isWebChatMode } from './copilot-mode';
import { CopilotModeContext } from './copilot-mode-context';
import { getFieldsToSync, type SyncedValues, toFormValue } from './copilot-workflow-form-sync';

type WorkflowFormValues = z.infer<typeof workflowSchema>;

/**
 * Shows the Copilot's edits to the workflow's name, description and tags in the configure form, whose `useForm`
 * reads them once on mount. Does nothing unless the editor runs the Copilot on web chat, so the legacy Copilot and
 * flag-off pages keep today's form.
 */
export function useCopilotWorkflowFormSync(form: UseFormReturn<WorkflowFormValues>, workflow: SyncedValues) {
  const isEnabled = isWebChatMode(useContext(CopilotModeContext));
  const syncedWorkflowRef = useRef(workflow);

  useEffect(() => {
    if (!isEnabled) return;

    const previous = syncedWorkflowRef.current;
    syncedWorkflowRef.current = workflow;

    for (const field of getFieldsToSync(previous, workflow, form.getValues())) {
      // An undefined default would reset to the old value instead of clearing the field.
      form.resetField(field, { defaultValue: toFormValue(field, workflow[field]) });
    }
  }, [isEnabled, form, workflow]);
}
