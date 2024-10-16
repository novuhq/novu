import { createContextHook } from '@/utils/context';
import { WorkflowEditorContext } from './workflow-editor-context';

export const useWorkflowEditorContext = createContextHook(WorkflowEditorContext);
