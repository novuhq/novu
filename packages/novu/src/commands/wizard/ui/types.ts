import type { InstalledSkill } from '../skills/install-skills';
import type { ProjectContext, ResolvedAuth, UserIntent, WizardCommandOptions } from '../types';

export type SessionPhase =
  | 'booting'
  | 'auth'
  | 'intake'
  | 'installing-skills'
  | 'agent-running'
  | 'awaiting-input'
  | 'done'
  | 'failed';

export interface ToolCall {
  id: string;
  name: string;
  label: string;
  inputSummary: string;
  startedAt: number;
  endedAt?: number;
  isError?: boolean;
  resultText?: string;
}

export type TranscriptEntry =
  | { kind: 'user'; id: string; text: string }
  | { kind: 'assistant'; id: string; markdown: string }
  | {
      kind: 'tool-batch';
      id: string;
      calls: ToolCall[];
      durationMs: number;
      collapsed: boolean;
    }
  | {
      kind: 'diff';
      id: string;
      file: string;
      patch: string;
      added: number;
      removed: number;
      collapsed: boolean;
    }
  | { kind: 'status'; id: string; tone: 'ok' | 'error' | 'info'; message: string }
  | { kind: 'system'; id: string; text: string };

export interface AgentRunSummary {
  totalMessages: number;
  toolCalls: number;
  errors: number;
}

export type SessionErrorSource = 'auth' | 'agent' | 'tool' | 'skills' | 'ui' | 'unknown';

export interface SessionError {
  id: string;
  at: number;
  phase: SessionPhase;
  source: SessionErrorSource;
  message: string;
  detail?: string;
  toolName?: string;
}

export interface SessionState {
  phase: SessionPhase;
  options: WizardCommandOptions;
  auth?: ResolvedAuth;
  authStatus: 'idle' | 'authorizing' | 'ready' | 'failed';
  authMessage?: string;
  project?: ProjectContext;
  intent?: UserIntent;
  installedSkills: InstalledSkill[];
  skillsMessage?: string;
  entries: TranscriptEntry[];
  liveAssistant?: { id: string; markdown: string };
  activeToolBatch?: { id: string; calls: ToolCall[]; startedAt: number };
  errors: SessionError[];
  summary: AgentRunSummary;
  turnStartedAt?: number;
  lastUserText?: string;
}

export interface MountInkAppParams {
  options: WizardCommandOptions;
  anonymousId?: string;
  onTrack?: (event: string, data?: Record<string, unknown>) => void;
  onComplete?: (summary: AgentRunSummary) => void;
}

export interface MountInkAppResult {
  exitCode: number;
  summary: AgentRunSummary;
}

export interface AssistantBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'unknown';
  text?: string;
  name?: string;
  id?: string;
  input?: Record<string, unknown>;
  isError?: boolean;
  toolUseId?: string;
}
