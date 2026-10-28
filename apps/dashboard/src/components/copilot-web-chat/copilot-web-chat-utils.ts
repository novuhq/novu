import type { AgentMessage, AgentToolPart } from '@novu/js';
import { AiWorkflowToolsEnum } from '@novu/shared';

/** The tools the Copilot agent emits (the same camelCase names on the direct and the MCP-backed suites). */
const WORKFLOW_WRITE_TOOL_NAMES: ReadonlySet<string> = new Set([
  AiWorkflowToolsEnum.SET_WORKFLOW_METADATA,
  AiWorkflowToolsEnum.ADD_STEP,
  AiWorkflowToolsEnum.ADD_STEP_IN_BETWEEN,
  AiWorkflowToolsEnum.EDIT_STEP_CONTENT,
  AiWorkflowToolsEnum.UPDATE_STEP_CONDITIONS,
  AiWorkflowToolsEnum.REMOVE_STEP,
  AiWorkflowToolsEnum.MOVE_STEP,
  AiWorkflowToolsEnum.UPDATE_PAYLOAD_SCHEMA,
]);

/** Tool names may arrive namespaced by the MCP server (`server__tool`), so match on the last segment. */
function normalizeToolName(toolName: string): string {
  const parts = toolName.split(/__|\./);

  return parts[parts.length - 1] ?? toolName;
}

export function isWorkflowWriteTool(toolName: string): boolean {
  return WORKFLOW_WRITE_TOOL_NAMES.has(normalizeToolName(toolName));
}

export type CopilotPageContext = {
  workflowId?: string;
  stepId?: string;
  /** Human readable ids shown in chips. Not sent to the agent. */
  workflowLabel?: string;
  stepLabel?: string;
};

export function buildCopilotMetadata(context: CopilotPageContext | undefined): Record<string, string> {
  const metadata: Record<string, string> = {};

  if (context?.workflowId) metadata.workflowId = context.workflowId;
  if (context?.stepId) metadata.stepId = context.stepId;

  return metadata;
}

const CONVERSATION_STORAGE_PREFIX = 'novu-copilot-conversation:';

/** Last Copilot conversation for a scope (environment + workflow), so a reload resumes it. */
export function readStoredConversationId(scope: string | undefined): string | undefined {
  if (!scope) return undefined;

  try {
    return window.localStorage.getItem(`${CONVERSATION_STORAGE_PREFIX}${scope}`) ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeStoredConversationId(scope: string | undefined, conversationId: string | undefined): void {
  if (!scope) return;

  try {
    const key = `${CONVERSATION_STORAGE_PREFIX}${scope}`;
    if (conversationId) window.localStorage.setItem(key, conversationId);
    else window.localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable (private mode, blocked site data); resuming is best-effort.
  }
}

export type LauncherState = 'idle' | 'working' | 'ready' | 'error' | 'off';

export function deriveLauncherState(input: {
  isAvailable: boolean;
  isRunning: boolean;
  hasError: boolean;
  hasUnseenAnswer: boolean;
}): LauncherState {
  if (!input.isAvailable) return 'off';
  if (input.isRunning) return 'working';
  if (input.hasError) return 'error';
  if (input.hasUnseenAnswer) return 'ready';

  return 'idle';
}

export type ToolRowStatus = 'pending' | 'active' | 'done' | 'error';
export type ToolChange = 'Added' | 'Edited' | 'Removed' | 'Moved';

export type ToolRow = {
  id: string;
  label: string;
  arg?: string;
  status: ToolRowStatus;
  change?: ToolChange;
  isWrite: boolean;
  /** The existing or new step a write tool targets; absent for workflow-level writes. */
  stepId?: string;
};

const TOOL_LABELS: Record<string, { label: string; change?: ToolChange }> = {
  [AiWorkflowToolsEnum.SET_WORKFLOW_METADATA]: { label: 'Editing workflow details', change: 'Edited' },
  [AiWorkflowToolsEnum.ADD_STEP]: { label: 'Adding step', change: 'Added' },
  [AiWorkflowToolsEnum.ADD_STEP_IN_BETWEEN]: { label: 'Adding step', change: 'Added' },
  [AiWorkflowToolsEnum.EDIT_STEP_CONTENT]: { label: 'Editing step content', change: 'Edited' },
  [AiWorkflowToolsEnum.UPDATE_STEP_CONDITIONS]: { label: 'Editing step conditions', change: 'Edited' },
  [AiWorkflowToolsEnum.REMOVE_STEP]: { label: 'Removing step', change: 'Removed' },
  [AiWorkflowToolsEnum.MOVE_STEP]: { label: 'Moving step', change: 'Moved' },
  [AiWorkflowToolsEnum.UPDATE_PAYLOAD_SCHEMA]: { label: 'Editing payload schema', change: 'Edited' },
};

function humanizeToolName(toolName: string): string {
  const words = normalizeToolName(toolName).replace(/_/g, ' ').trim();

  return words.charAt(0).toUpperCase() + words.slice(1);
}

const ARG_KEYS = ['stepId', 'name', 'stepName', 'workflowId', 'type', 'afterStepId'] as const;

function pickKeyArg(input: Record<string, unknown> | undefined): string | undefined {
  if (!input) return undefined;

  for (const key of ARG_KEYS) {
    const value = input[key];
    if (typeof value === 'string' && value) return value;
  }

  return undefined;
}

/** Step tools send `stepId` at the top level, except add/edit content which nest it under `step`. */
function pickTargetStepId(input: Record<string, unknown> | undefined): string | undefined {
  const nested = input?.step;
  const nestedStepId =
    typeof nested === 'object' && nested !== null ? (nested as { stepId?: unknown }).stepId : undefined;
  const stepId = input?.stepId ?? nestedStepId;

  return typeof stepId === 'string' && stepId ? stepId : undefined;
}

export function toolPartToRow(part: Pick<AgentToolPart, 'toolUseId' | 'toolName' | 'input' | 'state'>): ToolRow {
  const known = TOOL_LABELS[normalizeToolName(part.toolName)];
  let status: ToolRowStatus = 'active';

  if (part.state === 'output-available') status = 'done';
  else if (part.state === 'output-error') status = 'error';

  return {
    id: part.toolUseId,
    label: known?.label ?? humanizeToolName(part.toolName),
    arg: pickKeyArg(part.input),
    status,
    change: known?.change,
    isWrite: isWorkflowWriteTool(part.toolName),
    stepId: pickTargetStepId(part.input),
  };
}

export type ToolGroupSummary = { isRunning: boolean; title: string };

export function summarizeToolGroup(rows: readonly ToolRow[]): ToolGroupSummary {
  const isRunning = rows.some((row) => row.status === 'active' || row.status === 'pending');
  const doneWrites = rows.filter((row) => row.isWrite && row.status === 'done');
  const stepCount = new Set(doneWrites.flatMap((row) => (row.stepId ? [row.stepId] : []))).size;

  if (isRunning) return { isRunning, title: 'Editing workflow' };
  if (stepCount > 0) return { isRunning, title: `Edited ${stepCount} ${stepCount === 1 ? 'step' : 'steps'}` };
  if (doneWrites.length > 0) return { isRunning, title: 'Edited workflow' };

  return { isRunning, title: `Used ${rows.length} ${rows.length === 1 ? 'tool' : 'tools'}` };
}

export type AssistantBlock =
  | { kind: 'text'; key: string; text: string; streaming: boolean }
  | { kind: 'thinking'; key: string; text: string; streaming: boolean }
  | { kind: 'tools'; key: string; rows: ToolRow[] };

/** Groups consecutive tool parts into one block and drops parts this UI does not render. */
export function buildAssistantBlocks(message: AgentMessage): AssistantBlock[] {
  const blocks: AssistantBlock[] = [];

  message.parts.forEach((part, index) => {
    const key = `${message.id}:${index}`;

    if (part.type === 'text') {
      if (!part.text.trim()) return;
      blocks.push({ kind: 'text', key, text: part.text, streaming: part.state === 'streaming' });
    } else if (part.type === 'thinking') {
      blocks.push({ kind: 'thinking', key, text: part.text, streaming: part.state === 'streaming' });
    } else if (part.type === 'tool') {
      const row = toolPartToRow(part);
      const last = blocks[blocks.length - 1];

      if (last?.kind === 'tools') last.rows.push(row);
      else blocks.push({ kind: 'tools', key, rows: [row] });
    }
  });

  return blocks;
}

/** The last message is a user send the server never accepted (it stays in the thread and can be retried). */
export function getFailedSend(messages: readonly AgentMessage[]): AgentMessage | undefined {
  const last = messages[messages.length - 1];

  return last?.role === 'user' && last.status === 'failed' ? last : undefined;
}

/** Whether the thread still needs a placeholder: nothing from the agent is visible after the last user message. */
export function hasPendingReplyGap(messages: readonly AgentMessage[]): boolean {
  const last = messages[messages.length - 1];
  if (!last) return false;
  if (last.role === 'user') return last.status !== 'failed';

  return buildAssistantBlocks(last).length === 0;
}

export function getUserMessageText(message: AgentMessage): string {
  return message.parts
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('')
    .trim();
}
