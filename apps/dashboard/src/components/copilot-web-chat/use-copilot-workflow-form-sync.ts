import type { WorkflowResponseDto } from '@novu/shared';
import { useContext, useEffect, useRef } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import { workflowSchema } from '@/components/workflow-editor/schema';
import { isWebChatMode } from './copilot-mode';
import { CopilotModeContext } from './copilot-mode-context';

type WorkflowFormValues = z.infer<typeof workflowSchema>;

const FORM_FIELDS = workflowSchema.keyof().options;
const SYNCED_FIELDS = ['name', 'description', 'tags'] as const;

type SyncedValues = Pick<WorkflowResponseDto, (typeof SYNCED_FIELDS)[number]>;

function isSameValue(a: SyncedValues[keyof SyncedValues], b: SyncedValues[keyof SyncedValues]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

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

    // A reset fires the form's autosave, which would then also save the user's edits and the whole workflow over a
    // running Copilot turn. The form keeps fields dirty after a save, so any edit in this visit stops the sync.
    if (FORM_FIELDS.some((field) => form.getFieldState(field).isDirty)) return;

    for (const field of SYNCED_FIELDS) {
      if (isSameValue(previous[field], workflow[field])) continue;

      // An undefined default would reset to the old value instead of clearing the field.
      form.resetField(field, { defaultValue: workflow[field] ?? (field === 'tags' ? [] : '') });
    }
  }, [isEnabled, form, workflow]);
}
