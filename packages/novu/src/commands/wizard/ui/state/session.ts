import type { InstalledSkill } from '../../skills/install-skills';
import type { ProjectContext, ResolvedAuth, UserIntent, WizardCommandOptions } from '../../types';
import type { SessionError, SessionErrorSource, SessionState, ToolCall, TranscriptEntry } from '../types';

export type SessionAction =
  | { type: 'SET_AUTH'; auth: ResolvedAuth }
  | { type: 'AUTH_FAILED'; message: string }
  | { type: 'SET_PROJECT'; project: ProjectContext }
  | { type: 'SET_INTENT'; intent: UserIntent }
  | { type: 'SET_PHASE'; phase: SessionState['phase'] }
  | { type: 'SET_AUTH_STATUS'; status: SessionState['authStatus']; message?: string }
  | { type: 'SKILLS_INSTALLED'; installed: InstalledSkill[]; message?: string }
  | { type: 'USER_SUBMIT'; text: string }
  | { type: 'TURN_STARTED' }
  | { type: 'ASSISTANT_TEXT_CHUNK'; id: string; text: string }
  | { type: 'ASSISTANT_TEXT_COMMIT' }
  | { type: 'TOOL_USE'; call: ToolCall }
  | { type: 'TOOL_RESULT'; toolUseId: string; isError: boolean; resultText?: string }
  | { type: 'DIFF_PREVIEW'; entry: Extract<TranscriptEntry, { kind: 'diff' }> }
  | { type: 'TOOL_BATCH_FLUSH' }
  | { type: 'TURN_COMPLETE'; durationMs: number }
  | {
      type: 'PUSH_ERROR';
      message: string;
      source: SessionErrorSource;
      detail?: string;
      toolName?: string;
    }
  | { type: 'INFO'; message: string }
  | { type: 'CLEAR_TRANSCRIPT' }
  | { type: 'TOGGLE_ENTRY'; id: string }
  | { type: 'SET_DONE' };

export function createInitialState(options: WizardCommandOptions): SessionState {
  return {
    phase: 'booting',
    options,
    authStatus: 'idle',
    installedSkills: [],
    entries: [],
    errors: [],
    summary: { totalMessages: 0, toolCalls: 0, errors: 0 },
  };
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'SET_AUTH':
      return { ...state, auth: action.auth, authStatus: 'ready', phase: 'intake' };
    case 'AUTH_FAILED': {
      const id = `er-auth-${Date.now()}`;
      const error: SessionError = {
        id,
        at: Date.now(),
        phase: 'auth',
        source: 'auth',
        message: action.message,
      };

      return {
        ...state,
        authStatus: 'failed',
        authMessage: action.message,
        phase: 'failed',
        errors: [...state.errors, error],
        summary: { ...state.summary, errors: state.summary.errors + 1 },
      };
    }
    case 'SET_PROJECT':
      return { ...state, project: action.project };
    case 'SET_INTENT': {
      const text = formatIntentAsUserMessage(action.intent);
      const entry: TranscriptEntry = {
        kind: 'user',
        id: `u-intent-${Date.now()}`,
        text,
      };

      return {
        ...state,
        intent: action.intent,
        phase: 'installing-skills',
        entries: [...state.entries, entry],
        lastUserText: text,
      };
    }
    case 'SET_PHASE':
      return { ...state, phase: action.phase };
    case 'SET_AUTH_STATUS':
      return { ...state, authStatus: action.status, authMessage: action.message };
    case 'SKILLS_INSTALLED':
      return {
        ...state,
        installedSkills: action.installed,
        skillsMessage: action.message,
        phase: 'agent-running',
      };
    case 'USER_SUBMIT': {
      const id = `u-${Date.now()}-${state.entries.length}`;
      const entry: TranscriptEntry = { kind: 'user', id, text: action.text };

      return {
        ...state,
        entries: [...state.entries, entry],
        lastUserText: action.text,
        phase: 'agent-running',
        turnStartedAt: Date.now(),
      };
    }
    case 'TURN_STARTED':
      return { ...state, phase: 'agent-running', turnStartedAt: Date.now() };
    case 'ASSISTANT_TEXT_CHUNK': {
      const live =
        state.liveAssistant && state.liveAssistant.id === action.id
          ? { id: action.id, markdown: state.liveAssistant.markdown + action.text }
          : { id: action.id, markdown: action.text };

      return { ...state, liveAssistant: live };
    }
    case 'ASSISTANT_TEXT_COMMIT': {
      if (!state.liveAssistant) return state;
      const entry: TranscriptEntry = {
        kind: 'assistant',
        id: state.liveAssistant.id,
        markdown: state.liveAssistant.markdown,
      };

      return {
        ...state,
        entries: [...state.entries, entry],
        liveAssistant: undefined,
      };
    }
    case 'TOOL_USE': {
      const summary = { ...state.summary, toolCalls: state.summary.toolCalls + 1 };
      const batch = state.activeToolBatch ?? {
        id: `tb-${Date.now()}`,
        calls: [],
        startedAt: Date.now(),
      };

      return {
        ...state,
        summary,
        activeToolBatch: { ...batch, calls: [...batch.calls, action.call] },
      };
    }
    case 'TOOL_RESULT': {
      if (!state.activeToolBatch) return state;
      const calls = state.activeToolBatch.calls.map((call) =>
        call.id === action.toolUseId
          ? { ...call, endedAt: Date.now(), isError: action.isError, resultText: action.resultText }
          : call
      );

      if (!action.isError) {
        return { ...state, activeToolBatch: { ...state.activeToolBatch, calls } };
      }

      const failedCall = state.activeToolBatch.calls.find((call) => call.id === action.toolUseId);
      const toolName = failedCall?.name;
      const callLabel = failedCall?.label;
      const headline = toolName
        ? callLabel
          ? `${toolName} failed: ${callLabel}`
          : `${toolName} failed`
        : 'tool call failed';
      const sessionError: SessionError = {
        id: `er-tool-${Date.now()}-${state.errors.length}`,
        at: Date.now(),
        phase: state.phase,
        source: 'tool',
        message: headline,
        detail: action.resultText,
        toolName,
      };

      return {
        ...state,
        activeToolBatch: { ...state.activeToolBatch, calls },
        errors: [...state.errors, sessionError],
        summary: { ...state.summary, errors: state.summary.errors + 1 },
      };
    }
    case 'DIFF_PREVIEW':
      return { ...state, entries: [...state.entries, action.entry] };
    case 'TOOL_BATCH_FLUSH': {
      if (!state.activeToolBatch) return state;
      const durationMs = Date.now() - state.activeToolBatch.startedAt;
      const entry: TranscriptEntry = {
        kind: 'tool-batch',
        id: state.activeToolBatch.id,
        calls: state.activeToolBatch.calls,
        durationMs,
        collapsed: true,
      };

      return {
        ...state,
        entries: [...state.entries, entry],
        activeToolBatch: undefined,
      };
    }
    case 'TURN_COMPLETE': {
      const entry: TranscriptEntry = {
        kind: 'status',
        id: `st-${Date.now()}`,
        tone: 'ok',
        message: `turn complete in ${formatDuration(action.durationMs)}`,
      };

      return {
        ...state,
        entries: [...state.entries, entry],
        phase: 'awaiting-input',
        turnStartedAt: undefined,
      };
    }
    case 'PUSH_ERROR': {
      const id = `er-${Date.now()}-${state.entries.length}`;
      const entry: TranscriptEntry = {
        kind: 'status',
        id,
        tone: 'error',
        message: action.message,
      };
      const sessionError: SessionError = {
        id,
        at: Date.now(),
        phase: state.phase,
        source: action.source,
        message: action.message,
        detail: action.detail,
        toolName: action.toolName,
      };

      return {
        ...state,
        entries: [...state.entries, entry],
        errors: [...state.errors, sessionError],
        summary: { ...state.summary, errors: state.summary.errors + 1 },
      };
    }
    case 'INFO': {
      const entry: TranscriptEntry = {
        kind: 'status',
        id: `info-${Date.now()}-${state.entries.length}`,
        tone: 'info',
        message: action.message,
      };

      return { ...state, entries: [...state.entries, entry] };
    }
    case 'CLEAR_TRANSCRIPT':
      return { ...state, entries: [] };
    case 'TOGGLE_ENTRY':
      return {
        ...state,
        entries: state.entries.map((entry) => {
          if (entry.id !== action.id) return entry;
          if (entry.kind === 'tool-batch' || entry.kind === 'diff') {
            return { ...entry, collapsed: !entry.collapsed } as TranscriptEntry;
          }

          return entry;
        }),
      };
    case 'SET_DONE':
      return { ...state, phase: 'done' };
    default:
      return state;
  }
}

function formatIntentAsUserMessage(intent: UserIntent): string {
  const lines = [`**Goal:** ${intent.summary}`];
  const notes = intent.notes?.trim();
  if (notes) {
    lines.push('', `**Notes:** ${notes}`);
  }

  return lines.join('\n');
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);

  return `${minutes}m ${seconds}s`;
}
