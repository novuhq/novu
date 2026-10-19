import { atom, type WritableAtom } from 'nanostores';
import type { InstalledSkill } from '../skills/install-skills';
import type { ProjectContext, ResolvedAuth, WizardCommandOptions } from '../types';
import {
  AuthStatus,
  type McpClientCandidate,
  type McpInstallResult,
  type OutroData,
  OutroKind,
  RunPhase,
  type WizardGoal,
  type WizardSession,
} from './wizard-session';

export enum Overlay {
  None = 'none',
  Chat = 'chat',
  Help = 'help',
  Errors = 'errors',
}

export enum TrailKind {
  Status = 'status',
  Assistant = 'assistant',
  ToolUse = 'tool-use',
  ToolResult = 'tool-result',
  Diff = 'diff',
  Error = 'error',
}

export type TrailEntry =
  | { kind: TrailKind.Status; id: string; at: number; tone: 'info' | 'ok' | 'error' | 'warn'; message: string }
  | { kind: TrailKind.Assistant; id: string; at: number; markdown: string }
  | {
      kind: TrailKind.ToolUse;
      id: string;
      at: number;
      toolName: string;
      label: string;
      inputSummary: string;
      isError?: boolean;
      endedAt?: number;
      resultText?: string;
      branch?: string;
    }
  | { kind: TrailKind.Diff; id: string; at: number; file: string; patch: string; added: number; removed: number }
  | {
      kind: TrailKind.Error;
      id: string;
      at: number;
      source: 'auth' | 'agent' | 'tool' | 'skills' | 'ui' | 'mcp' | 'report' | 'unknown';
      message: string;
      detail?: string;
      toolName?: string;
    };

export type LiveTailLine = { id: string; text: string; tone?: 'info' | 'ok' | 'error' | 'warn' };

export type TodoEntry = {
  id: string;
  content: string;
  activeForm?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  /** Captured the first time the entry transitions to `in_progress`. */
  startedAt?: number;
  /** Captured when the entry transitions to a terminal state. */
  endedAt?: number;
  /** Convenience: `endedAt - startedAt`, only populated once the entry settles. */
  durationMs?: number;
};

export type PipelinePhaseId =
  | 'bootstrap'
  | 'auth'
  | 'skills'
  | 'install'
  | 'agent'
  | 'validate'
  | 'mcp'
  | 'report'
  | 'done';

export type PhaseStatus = 'pending' | 'running' | 'done' | 'error' | 'cancelled';

export type PipelinePhase = {
  id: PipelinePhaseId;
  /** Shown while the row hasn't started yet. */
  idleForm: string;
  /** Shown while the row is actively running (also used as the spinner label). */
  activeForm: string;
  /** Shown once the row is done (also used for error / cancelled fallback). */
  completedForm: string;
  status: PhaseStatus;
  hint?: string;
  /** Captured the first time the phase transitions to `running`. */
  startedAt?: number;
  /** Captured when the phase transitions to a terminal state. */
  endedAt?: number;
  /** Convenience: `endedAt - startedAt`, only populated once the phase settles. */
  durationMs?: number;
};

const INITIAL_PHASES: PipelinePhase[] = [
  {
    id: 'bootstrap',
    idleForm: 'Bootstrap',
    activeForm: 'Bootstrapping…',
    completedForm: 'Bootstrapped',
    status: 'pending',
  },
  {
    id: 'auth',
    idleForm: 'Authenticate',
    activeForm: 'Authorising via the Novu Dashboard…',
    completedForm: 'Authenticated',
    status: 'pending',
  },
  {
    id: 'skills',
    idleForm: 'Install skills',
    activeForm: 'Installing Novu skills…',
    completedForm: 'Skills installed',
    status: 'pending',
  },
  {
    id: 'install',
    idleForm: 'Install packages',
    activeForm: 'Installing Novu packages…',
    completedForm: 'Packages installed',
    status: 'pending',
  },
  {
    id: 'mcp',
    idleForm: 'Install MCP',
    activeForm: 'Installing Novu MCP…',
    completedForm: 'MCP installed',
    status: 'pending',
  },
  {
    id: 'agent',
    idleForm: 'Run agent',
    activeForm: 'Agent running…',
    completedForm: 'Agent run complete',
    status: 'pending',
  },
  {
    id: 'validate',
    idleForm: 'Validate',
    activeForm: 'Validating workspaces…',
    completedForm: 'Validation complete',
    status: 'pending',
  },
  {
    id: 'report',
    idleForm: 'Write report',
    activeForm: 'Writing wizard report…',
    completedForm: 'Report written',
    status: 'pending',
  },
  {
    id: 'done',
    idleForm: 'Wrap up',
    activeForm: 'Wrapping up…',
    completedForm: 'Done',
    status: 'pending',
  },
];

/**
 * Live tail buffer cap. The viewport renders at most ~5 rows; the buffer
 * keeps a deeper history so the user can scroll back through recent agent
 * activity without losing context.
 */
const MAX_LIVE_TAIL = 200;

type Gate = { promise: Promise<void>; resolve: () => void };

export type WizardStore = {
  /** Reactive session atom (subscribe via `useStore` / `useSyncExternalStore`). */
  session: WritableAtom<WizardSession>;
  phases: WritableAtom<PipelinePhase[]>;
  todos: WritableAtom<TodoEntry[]>;
  trail: WritableAtom<TrailEntry[]>;
  liveTail: WritableAtom<LiveTailLine[]>;
  overlay: WritableAtom<Overlay>;

  setProject: (project: ProjectContext) => void;
  setGoal: (goal: WizardGoal) => void;
  setAuthStatus: (status: AuthStatus, message?: string) => void;
  setAuthDashboardUrl: (url: string | null) => void;
  setAuth: (auth: ResolvedAuth) => void;
  setAuthFailed: (error: string) => void;
  setRunPhase: (phase: RunPhase) => void;
  setOutroData: (data: OutroData) => void;
  setSkills: (installed: InstalledSkill[], message?: string) => void;
  setMcpCandidates: (candidates: McpClientCandidate[]) => void;
  setMcpSelection: (clientId: string | null) => void;
  /**
   * Appends a single successful install to `mcp.installed` and pushes the
   * `mcp` phase to `running` (the runner finalises the phase via
   * {@link finishMcpInstalls} once every adapter has been written).
   */
  addMcpInstall: (result: McpInstallResult) => void;
  /**
   * Marks the MCP phase as `done` (or `cancelled` if `skipped`) without
   * appending a result. Renders the row hint based on the accumulated
   * {@link McpInstallResult} list.
   */
  finishMcpInstalls: (skipped?: boolean) => void;
  setReport: (path: string) => void;

  setPhase: (id: PipelinePhaseId, status: PhaseStatus, hint?: string) => void;
  syncTodos: (entries: TodoEntry[]) => void;

  pushTrail: (entry: TrailEntry) => void;
  pushStatus: (message: string, tone?: 'info' | 'ok' | 'error' | 'warn') => void;
  pushLiveTail: (text: string, tone?: LiveTailLine['tone']) => void;
  appendAssistant: (id: string, chunk: string) => void;

  openOverlay: (overlay: Overlay) => void;
  closeOverlay: () => void;

  /**
   * Awaitable gate. Driver code calls `await getGate('mcp').promise` and the
   * UI screen calls `getGate('mcp').resolve()` when the user picks a client.
   * Each gate id is created lazily; the same id resolves once.
   */
  getGate: (id: string) => Gate;
};

export function createWizardStore(options: WizardCommandOptions, goal: WizardGoal = 'full'): WizardStore {
  const initialSession: WizardSession = {
    options,
    goal,
    auth: { status: AuthStatus.Idle },
    installedSkills: [],
    runPhase: RunPhase.Idle,
    mcp: { candidates: [], selectedClientId: null, installed: [], skipped: false },
    startedAt: Date.now(),
  };

  const session = atom<WizardSession>(initialSession);
  const phases = atom<PipelinePhase[]>(INITIAL_PHASES.map((phase) => ({ ...phase })));
  const todos = atom<TodoEntry[]>([]);
  const trail = atom<TrailEntry[]>([]);
  const liveTail = atom<LiveTailLine[]>([]);
  const overlay = atom<Overlay>(Overlay.None);

  const gates = new Map<string, Gate>();
  const getGate = (id: string): Gate => {
    const cached = gates.get(id);
    if (cached) return cached;
    let resolve!: () => void;
    const promise = new Promise<void>((res) => {
      resolve = res;
    });
    const gate = { promise, resolve };
    gates.set(id, gate);

    return gate;
  };

  const updateSession = (mutate: (prev: WizardSession) => WizardSession): void => {
    session.set(mutate(session.get()));
  };

  const setPhase = (id: PipelinePhaseId, status: PhaseStatus, hint?: string): void => {
    const now = Date.now();
    phases.set(
      phases.get().map((phase) => {
        if (phase.id !== id) return phase;
        const next: PipelinePhase = { ...phase, status };
        if (hint !== undefined) next.hint = hint;
        if (status === 'running' && next.startedAt === undefined) {
          next.startedAt = now;
        }
        if (
          (status === 'done' || status === 'error' || status === 'cancelled') &&
          next.endedAt === undefined &&
          next.startedAt !== undefined
        ) {
          next.endedAt = now;
          next.durationMs = now - next.startedAt;
        }

        return next;
      })
    );
  };

  const pushTrail = (entry: TrailEntry): void => {
    trail.set([...trail.get(), entry]);
  };

  const pushLiveTail = (text: string, tone?: LiveTailLine['tone']): void => {
    const next = [...liveTail.get(), { id: `lt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text, tone }];
    liveTail.set(next.slice(-MAX_LIVE_TAIL));
  };

  const pushStatus = (message: string, tone: 'info' | 'ok' | 'error' | 'warn' = 'info'): void => {
    pushTrail({ kind: TrailKind.Status, id: `st-${Date.now()}`, at: Date.now(), tone, message });
    pushLiveTail(message, tone);
  };

  const appendAssistant = (id: string, chunk: string): void => {
    const current = trail.get();
    const last = current[current.length - 1];
    if (last && last.kind === TrailKind.Assistant && last.id === id) {
      const next = [...current];
      next[next.length - 1] = { ...last, markdown: last.markdown + chunk };
      trail.set(next);

      return;
    }
    pushTrail({ kind: TrailKind.Assistant, id, at: Date.now(), markdown: chunk });
  };

  return {
    session,
    phases,
    todos,
    trail,
    liveTail,
    overlay,

    setProject: (project) => {
      updateSession((prev) => ({ ...prev, project }));
    },
    setGoal: (goal) => {
      updateSession((prev) => ({ ...prev, goal }));
    },
    setAuthStatus: (status, message) => {
      updateSession((prev) => ({ ...prev, auth: { ...prev.auth, status, message } }));
    },
    setAuthDashboardUrl: (url) => {
      updateSession((prev) => ({
        ...prev,
        auth: { ...prev.auth, dashboardLoginUrl: url ?? undefined },
      }));
    },
    setAuth: (auth) => {
      updateSession((prev) => ({
        ...prev,
        auth: {
          ...prev.auth,
          status: AuthStatus.Ready,
          resolved: auth,
          message: undefined,
          dashboardLoginUrl: undefined,
          error: undefined,
        },
      }));
      setPhase('auth', 'done', auth.environmentName ? `Authenticated · ${auth.environmentName}` : 'Authenticated');
    },
    setAuthFailed: (error) => {
      updateSession((prev) => ({
        ...prev,
        auth: { ...prev.auth, status: AuthStatus.Failed, error, dashboardLoginUrl: undefined },
      }));
      setPhase('auth', 'error', error);
    },
    setRunPhase: (phase) => {
      updateSession((prev) => ({ ...prev, runPhase: phase }));
    },
    setOutroData: (data) => {
      updateSession((prev) => ({
        ...prev,
        outroData: data,
        runPhase: data.kind === OutroKind.Error ? RunPhase.Error : RunPhase.Outro,
      }));
    },
    setSkills: (installed, message) => {
      updateSession((prev) => ({ ...prev, installedSkills: installed, skillsMessage: message }));
      setPhase('skills', 'done', message);
    },
    setMcpCandidates: (candidates) => {
      updateSession((prev) => ({ ...prev, mcp: { ...prev.mcp, candidates } }));
    },
    setMcpSelection: (clientId) => {
      updateSession((prev) => ({ ...prev, mcp: { ...prev.mcp, selectedClientId: clientId } }));
    },
    addMcpInstall: (result) => {
      updateSession((prev) => ({
        ...prev,
        mcp: { ...prev.mcp, installed: [...prev.mcp.installed, result], skipped: false },
      }));
      setPhase('mcp', 'running', `Installed into ${result.clientLabel}`);
    },
    finishMcpInstalls: (skipped = false) => {
      updateSession((prev) => ({ ...prev, mcp: { ...prev.mcp, skipped } }));
      const installed = session.get().mcp.installed;
      if (skipped) {
        setPhase('mcp', 'cancelled', 'Skipped');

        return;
      }
      if (installed.length === 0) {
        setPhase('mcp', 'error');

        return;
      }
      const hint =
        installed.length === 1
          ? `Installed into ${installed[0].clientLabel}`
          : `Installed into ${installed.length} editors`;
      setPhase('mcp', 'done', hint);
    },
    setReport: (path) => {
      updateSession((prev) => ({ ...prev, report: { path } }));
      setPhase('report', 'done', path);
    },

    setPhase,

    syncTodos: (entries) => {
      const now = Date.now();
      const previousById = new Map(todos.get().map((todo) => [todo.id, todo]));
      const merged = entries.map<TodoEntry>((entry) => {
        const prev = previousById.get(entry.id);
        const next: TodoEntry = {
          ...entry,
          startedAt: prev?.startedAt,
          endedAt: prev?.endedAt,
          durationMs: prev?.durationMs,
        };
        if (entry.status === 'in_progress' && next.startedAt === undefined) {
          next.startedAt = now;
        }
        if (
          (entry.status === 'completed' || entry.status === 'cancelled') &&
          next.endedAt === undefined &&
          next.startedAt !== undefined
        ) {
          next.endedAt = now;
          next.durationMs = now - next.startedAt;
        }

        return next;
      });
      todos.set(merged);
    },

    pushTrail,
    pushStatus,
    pushLiveTail,
    appendAssistant,

    openOverlay: (next) => {
      overlay.set(next);
    },
    closeOverlay: () => {
      overlay.set(Overlay.None);
    },

    getGate,
  };
}
