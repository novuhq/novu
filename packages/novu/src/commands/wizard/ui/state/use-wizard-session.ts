import React from 'react';
import {
  buildInitialUserMessage,
  buildSDKUserMessage,
  createAgentIterator,
  isMainTurnResult,
  type SDKUserMessage,
} from '../../agent/iterator';
import { extractToolLabel } from '../../agent/tool-labels';
import { resolveAuth } from '../../auth/resolve-auth';
import { detectProject } from '../../context/detect-project';
import { detectClaudeSettingsConflicts, formatClaudeSettingsConflictMessage } from '../../skills/check-claude-settings';
import { getSkillHostDir, installSkills, resolveWizardRuntimeSkillHosts } from '../../skills/install-skills';
import type { ResolvedAuth, UserIntent } from '../../types';
import { buildEditDiff, buildWriteDiff } from '../markdown/diff';
import type { MountInkAppParams, SessionState, ToolCall, TranscriptEntry } from '../types';
import { createInitialState, sessionReducer } from './session';

interface UseWizardSessionOptions extends MountInkAppParams {
  defaultIntent?: UserIntent;
}

export interface WizardSessionApi {
  state: SessionState;
  submitUser: (text: string) => void;
  submitIntent: (intent: UserIntent) => void;
  toggleEntry: (id: string) => void;
  interrupt: () => void;
  exit: (reason?: string) => void;
  clear: () => void;
  showInfo: (message: string) => void;
}

export function useWizardSession(opts: UseWizardSessionOptions): WizardSessionApi {
  const [state, dispatch] = React.useReducer(sessionReducer, createInitialState(opts.options));
  const stateRef = React.useRef(state);
  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const promptQueueRef = React.useRef<PromptQueue | null>(null);
  const interruptRef = React.useRef<(() => Promise<void>) | null>(null);
  const closeRef = React.useRef<(() => void) | null>(null);
  const interruptingRef = React.useRef(false);
  const interruptFallbackTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitRef = React.useRef<(reason?: string) => void>(() => undefined);
  const agentLoopStartedRef = React.useRef(false);
  const agentStoppedRef = React.useRef(false);

  const exit = React.useCallback((reason?: string) => {
    exitRef.current(reason);
  }, []);

  /**
   * Soft-interrupt the in-flight turn. Triggered by the first Ctrl+C tap
   * while `busy` is true. We rely on the SDK to send the cancel down to the
   * CLI subprocess — it then emits a `result` message which the for-await
   * loop turns into a `TURN_COMPLETE` (phase → awaiting-input). The
   * fallback timer covers the case where the CLI dies / never replies, so
   * the prompt isn't stuck "thinking" forever.
   */
  const interrupt = React.useCallback(() => {
    if (!interruptRef.current) return;
    if (interruptingRef.current) return;
    interruptingRef.current = true;
    dispatch({ type: 'INFO', message: 'interrupting agent…' });
    void interruptRef.current().finally(() => {
      interruptingRef.current = false;
    });
    if (interruptFallbackTimerRef.current) {
      clearTimeout(interruptFallbackTimerRef.current);
    }
    interruptFallbackTimerRef.current = setTimeout(() => {
      interruptFallbackTimerRef.current = null;
      if (stateRef.current.phase !== 'agent-running') return;
      dispatch({ type: 'TOOL_BATCH_FLUSH' });
      dispatch({ type: 'ASSISTANT_TEXT_COMMIT' });
      dispatch({ type: 'SET_PHASE', phase: 'awaiting-input' });
    }, 4000);
  }, []);

  const submitUser = React.useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    dispatch({ type: 'USER_SUBMIT', text: trimmed });
    promptQueueRef.current?.push(buildSDKUserMessage(trimmed));
  }, []);

  const submitIntent = React.useCallback((intent: UserIntent) => {
    dispatch({ type: 'SET_INTENT', intent });
  }, []);

  const toggleEntry = React.useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_ENTRY', id });
  }, []);

  const clear = React.useCallback(() => {
    dispatch({ type: 'CLEAR_TRANSCRIPT' });
  }, []);

  const showInfo = React.useCallback((message: string) => {
    dispatch({ type: 'INFO', message });
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    exitRef.current = (reason?: string) => {
      cancelled = true;
      agentStoppedRef.current = true;
      if (interruptFallbackTimerRef.current) {
        clearTimeout(interruptFallbackTimerRef.current);
        interruptFallbackTimerRef.current = null;
      }
      if (reason) dispatch({ type: 'INFO', message: reason });
      promptQueueRef.current?.close();
      closeRef.current?.();
      dispatch({ type: 'SET_DONE' });
      opts.onComplete?.(stateRef.current.summary);
    };

    const project = detectProject(process.cwd());
    dispatch({ type: 'SET_PROJECT', project });

    (async () => {
      dispatch({ type: 'SET_PHASE', phase: 'auth' });
      dispatch({ type: 'SET_AUTH_STATUS', status: 'authorizing' });
      try {
        const auth = await resolveAuth(opts.options, {
          onStatus: (message) => {
            if (!cancelled) dispatch({ type: 'SET_AUTH_STATUS', status: 'authorizing', message });
          },
        });
        if (cancelled) return;
        dispatch({ type: 'SET_AUTH', auth });
        opts.onTrack?.('Wizard Auth Completed', { source: auth.source });

        if (opts.defaultIntent) {
          dispatch({ type: 'SET_INTENT', intent: opts.defaultIntent });
        }
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        dispatch({ type: 'AUTH_FAILED', message });
      }
    })();

    return () => {
      cancelled = true;
      agentStoppedRef.current = true;
      if (interruptFallbackTimerRef.current) {
        clearTimeout(interruptFallbackTimerRef.current);
        interruptFallbackTimerRef.current = null;
      }
      promptQueueRef.current?.close();
      closeRef.current?.();
    };
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, []);

  React.useEffect(() => {
    if (state.phase !== 'installing-skills') return;
    if (!state.intent || !state.auth) return;

    let cancelled = false;
    (async () => {
      try {
        const hosts = resolveWizardRuntimeSkillHosts(process.cwd());
        const result = installSkills(process.cwd(), {
          hosts,
          officialBranch: state.options.skillsBranch,
        });
        if (cancelled) return;
        const installedDirs = Array.from(new Set(result.installed.map((skill) => getSkillHostDir(skill.host))))
          .filter(Boolean)
          .join(' + ');
        const message =
          result.installed.length > 0
            ? `installed ${result.installed.length} Novu skill files (${installedDirs})`
            : 'no skill targets detected (skipping)';
        const conflicts = detectClaudeSettingsConflicts(process.cwd());
        if (conflicts.length > 0) {
          dispatch({ type: 'INFO', message: formatClaudeSettingsConflictMessage(conflicts) });
        }
        dispatch({ type: 'SKILLS_INSTALLED', installed: result.installed, message });
      } catch (error) {
        if (cancelled) return;
        const messageText = error instanceof Error ? error.message : String(error);
        dispatch({
          type: 'PUSH_ERROR',
          source: 'skills',
          message: `skill install failed: ${messageText}`,
          detail: error instanceof Error ? error.stack : undefined,
        });
        dispatch({ type: 'SET_PHASE', phase: 'agent-running' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [state.phase, state.intent, state.auth, state.options.skillsBranch]);

  React.useEffect(() => {
    if (agentLoopStartedRef.current) return;
    if (state.phase !== 'agent-running') return;
    if (!state.auth || !state.project || !state.intent) return;

    agentLoopStartedRef.current = true;
    const queue = createPromptQueue(buildInitialUserMessage(state.intent));
    promptQueueRef.current = queue;

    (async () => {
      try {
        const handle = await createAgentIterator({
          options: state.options,
          auth: state.auth as ResolvedAuth,
          project: state.project!,
          intent: state.intent!,
          initialMessage: buildInitialUserMessage(state.intent!),
          prompt: queue.iterator,
        });
        interruptRef.current = handle.interrupt;
        closeRef.current = handle.close;

        const pendingDiffs = new Map<string, TranscriptEntry>();

        for await (const message of handle.iterator) {
          if (agentStoppedRef.current) break;
          processSdkMessage(message, dispatch, pendingDiffs);
          if (isMainTurnResult(message)) {
            const startedAt = stateRef.current.turnStartedAt ?? Date.now();
            dispatch({ type: 'ASSISTANT_TEXT_COMMIT' });
            dispatch({ type: 'TOOL_BATCH_FLUSH' });
            for (const entry of pendingDiffs.values()) {
              dispatch({ type: 'DIFF_PREVIEW', entry: entry as Extract<TranscriptEntry, { kind: 'diff' }> });
            }
            pendingDiffs.clear();
            dispatch({ type: 'TURN_COMPLETE', durationMs: Date.now() - startedAt });
            if (interruptFallbackTimerRef.current) {
              clearTimeout(interruptFallbackTimerRef.current);
              interruptFallbackTimerRef.current = null;
            }
          }
        }
      } catch (error) {
        if (agentStoppedRef.current) return;
        const messageText = error instanceof Error ? error.message : String(error);
        dispatch({
          type: 'PUSH_ERROR',
          source: 'agent',
          message: messageText,
          detail: error instanceof Error ? error.stack : undefined,
        });
        dispatch({ type: 'SET_PHASE', phase: 'awaiting-input' });
      }
    })();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [state.phase, state.auth, state.project, state.intent]);

  return { state, submitUser, submitIntent, toggleEntry, interrupt, exit, clear, showInfo };
}

interface PromptQueue {
  iterator: AsyncIterableIterator<SDKUserMessage>;
  push: (message: SDKUserMessage) => void;
  close: () => void;
}

function createPromptQueue(initial: string): PromptQueue {
  const queue: SDKUserMessage[] = [buildSDKUserMessage(initial)];
  let resolveNext: ((value: IteratorResult<SDKUserMessage>) => void) | null = null;
  let closed = false;

  const iterator: AsyncIterableIterator<SDKUserMessage> = {
    [Symbol.asyncIterator]() {
      return this;
    },
    async next() {
      if (queue.length > 0) {
        return { value: queue.shift() as SDKUserMessage, done: false };
      }
      if (closed) {
        return { value: undefined as unknown as SDKUserMessage, done: true };
      }

      return new Promise<IteratorResult<SDKUserMessage>>((resolve) => {
        resolveNext = resolve;
      });
    },
    async return() {
      closed = true;
      if (resolveNext) {
        const r = resolveNext;
        resolveNext = null;
        r({ value: undefined as unknown as SDKUserMessage, done: true });
      }

      return { value: undefined as unknown as SDKUserMessage, done: true };
    },
  };

  return {
    iterator,
    push: (message) => {
      if (closed) return;
      if (resolveNext) {
        const r = resolveNext;
        resolveNext = null;
        r({ value: message, done: false });
      } else {
        queue.push(message);
      }
    },
    close: () => {
      closed = true;
      if (resolveNext) {
        const r = resolveNext;
        resolveNext = null;
        r({ value: undefined as unknown as SDKUserMessage, done: true });
      }
    },
  };
}

function processSdkMessage(
  message: unknown,
  dispatch: React.Dispatch<ReturnType<typeof sessionReducer> extends never ? never : import('./session').SessionAction>,
  pendingDiffs: Map<string, TranscriptEntry>
): void {
  if (!message || typeof message !== 'object') return;
  const typed = message as {
    type?: string;
    message?: { content?: unknown };
    subtype?: string;
    result?: string;
    is_error?: boolean;
    errors?: unknown[];
    error?: unknown;
  };

  if (typed.type === 'assistant' && typed.message?.content) {
    const content = typed.message.content;
    if (!Array.isArray(content)) return;

    for (const block of content) {
      if (!block || typeof block !== 'object') continue;
      const part = block as {
        type?: string;
        text?: string;
        name?: string;
        id?: string;
        input?: Record<string, unknown>;
      };

      if (part.type === 'text' && typeof part.text === 'string' && part.text.length > 0) {
        const id = `a-${Date.now()}`;
        dispatch({ type: 'ASSISTANT_TEXT_CHUNK', id, text: part.text });
      } else if (part.type === 'tool_use' && part.name) {
        const id = part.id ?? `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const labelInfo = extractToolLabel(part.name, part.input ?? {});
        const call: ToolCall = {
          id,
          name: part.name,
          label: labelInfo.short,
          inputSummary: labelInfo.full,
          startedAt: Date.now(),
        };
        dispatch({ type: 'TOOL_USE', call });
        const diffEntry = maybeBuildDiffEntry(id, part.name, part.input ?? {});
        if (diffEntry) pendingDiffs.set(id, diffEntry);
      }
    }

    return;
  }

  if (typed.type === 'user' && typed.message?.content && Array.isArray(typed.message.content)) {
    for (const block of typed.message.content as unknown[]) {
      if (!block || typeof block !== 'object') continue;
      const part = block as { type?: string; tool_use_id?: string; is_error?: boolean; content?: unknown };
      if (part.type === 'tool_result' && part.tool_use_id) {
        const isError = !!part.is_error;
        const resultText = extractToolResultText(part.content);
        dispatch({ type: 'TOOL_RESULT', toolUseId: part.tool_use_id, isError, resultText });
      }
    }

    return;
  }

  if (typed.type === 'result' && typed.is_error) {
    const detail = formatErrorDetail(typed.errors ?? typed.error ?? typed.result ?? typed.subtype);
    dispatch({ type: 'PUSH_ERROR', source: 'agent', message: detail });

    return;
  }

  if (typed.type === 'error' || typed.subtype === 'error' || typed.is_error) {
    const detail = formatErrorDetail(typed.errors ?? typed.error ?? typed.result ?? message);
    dispatch({ type: 'PUSH_ERROR', source: 'agent', message: detail });
  }
}

function maybeBuildDiffEntry(id: string, toolName: string, input: Record<string, unknown>): TranscriptEntry | null {
  try {
    if (toolName === 'Edit') {
      const filePath = String(input.file_path ?? '');
      const oldString = String(input.old_string ?? '');
      const newString = String(input.new_string ?? '');
      if (!filePath) return null;
      const diff = buildEditDiff(filePath, oldString, newString);

      return {
        kind: 'diff',
        id: `diff-${id}`,
        file: filePath,
        patch: diff.patch,
        added: diff.added,
        removed: diff.removed,
        collapsed: false,
      };
    }
    if (toolName === 'Write') {
      const filePath = String(input.file_path ?? '');
      const content = String(input.content ?? '');
      if (!filePath) return null;
      const diff = buildWriteDiff(filePath, content);

      return {
        kind: 'diff',
        id: `diff-${id}`,
        file: filePath,
        patch: diff.patch,
        added: diff.added,
        removed: diff.removed,
        collapsed: false,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function formatErrorDetail(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function extractToolResultText(content: unknown): string | undefined {
  if (typeof content === 'string') {
    const trimmed = content.trim();

    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const block of content) {
      if (!block || typeof block !== 'object') continue;
      const part = block as { type?: string; text?: string };
      if (typeof part.text === 'string' && part.text.length > 0) parts.push(part.text);
    }
    const joined = parts.join('\n').trim();

    return joined.length > 0 ? joined : undefined;
  }
  if (content && typeof content === 'object') {
    try {
      return JSON.stringify(content);
    } catch {
      return undefined;
    }
  }

  return undefined;
}
