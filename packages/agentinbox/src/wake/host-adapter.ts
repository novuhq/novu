import type { WakeHostId } from '../api/wake';

/**
 * What wake needs from a host, and all it knows of one. The core (`loop.ts`) keeps the lease, waits for
 * messages, keeps one session per conversation and round, holds the limits, gets the answers out and asks the
 * operator; an adapter only turns its host's own interface into these few calls. Claude Code drives
 * `claude -p` over stream-json (`claude-code.ts`); Codex (`codex app-server`), OpenCode (`opencode serve`) and
 * Cursor (`agent acp`) fit the same shape (WAKE/research/host-interfaces.md, section 9): each opens or goes on
 * with a session, takes messages while it works, says when a turn ends, asks before what its settings don't
 * allow and waits for the answer, and stops when told.
 */
export interface HostAdapter {
  readonly id: WakeHostId;
  /** As people see it: "Claude Code". */
  readonly name: string;
  /**
   * Whether the host can be woken here: installed, signed in, and what about the project the operator should
   * know. Never runs a model.
   */
  check(project: string, env?: NodeJS.ProcessEnv): HostCheck;
  /** Starts a session in `options.project`, or goes on with the one `options.resume` names. */
  open(options: OpenOptions, handlers: SessionHandlers): HostSession;
}

export type HostCheck =
  | { ok: true; program: HostProgram; version?: string; warnings: string[] }
  | { ok: false; message: string };

/** How to start the host: the program and the arguments before the adapter's own. */
export interface HostProgram {
  command: string;
  args: readonly string[];
}

export interface OpenOptions {
  program: HostProgram;
  /** The folder the host works in, absolute. */
  project: string;
  /** The host's own id of the session to go on with (`HostSession.id` from before). Without it, a new one. */
  resume?: string;
  /** What the host is told for the whole session about being woken: who writes, how to answer them. */
  instructions: string;
  /** Where the host's environment comes from; the process's by default. */
  env?: NodeJS.ProcessEnv;
}

/** One session: one conversation, in one round (until it is resolved). */
export interface HostSession {
  /** The host's own id for it, kept for the conversation so the next wake goes on with it. */
  readonly id: string;
  /**
   * Hands the host a message: it starts a turn, or joins the one running. False once the session is ending,
   * when the message has to wait for the next one.
   */
  send(input: SessionInput): boolean;
  /** Stops the turn running and drops the messages waiting behind it; open questions are withdrawn. */
  interrupt(): Promise<void>;
  /** Ends the session's process. The host keeps its history, so it can be gone on with later. */
  close(): Promise<void>;
}

export interface SessionInput {
  /** Comes back in `TurnEnded.inputIds`. */
  id: string;
  /** The message as the host reads it. */
  text: string;
}

/** What the host tells the core while the session is open. */
export interface SessionHandlers {
  /**
   * What the host is doing: a line for the log ("Bash: npm test"), and what it is, as a permission question
   * names it, so the core knows the agent's own reply when it starts. `toolId` comes back in `toolEnded`.
   */
  progress(note: string, subject: PermissionQuestion['subject'], toolId?: string): void;
  /** A tool `progress` named by its id ended: a command that waited for an answer doesn't wait any more. */
  toolEnded(toolId: string): void;
  /** A turn ended. Every input sent comes back in exactly one, or the session is lost. */
  turnEnded(turn: TurnEnded): void;
  /**
   * The host wants to do something its settings don't allow, and waits. Resolves with one of
   * `question.options`. `signal` fires when the host withdraws the question (an interrupt, say).
   */
  askPermission(question: PermissionQuestion, signal: AbortSignal): Promise<PermissionAnswer>;
  /** A question for a person that isn't a permission. `undefined`: nobody answered, and the host is told so. */
  askQuestion(question: HostQuestion, signal: AbortSignal): Promise<HostAnswer | undefined>;
  /** The host's process ended by itself. `sessionGone`: the session to go on with doesn't exist any more. */
  lost(error: string, sessionGone: boolean): void;
}

export interface TurnEnded {
  /** The inputs the turn answered (a host may take several into one), or dropped on an interrupt. */
  inputIds: string[];
  outcome: 'completed' | 'interrupted' | 'failed';
  /** The turn's last words, for the people in the conversation. */
  text?: string;
  error?: string;
}

export interface PermissionQuestion {
  /** What is asked for, in a form the core can match (the agent's own replies) as well as show. */
  subject:
    | { kind: 'command'; command: string }
    | { kind: 'files'; paths: string[] }
    | { kind: 'network'; hosts: string[] }
    /** A tool of an MCP server, by the name the host gave the server, with what it is called with. */
    | { kind: 'mcp'; server: string; tool: string; input: Record<string, unknown> }
    | { kind: 'tool'; name: string }
    | { kind: 'other' };
  /** What the host wants to do, as the operator reads it: "run `npm publish`", "edit ~/notes/todo.md". */
  action: string;
  /** The same, short, for a card title the whole doesn't fit: "run a command". */
  brief: string;
  /** The host's own words about it, and why it asks. */
  details: string[];
  /** What this host offers for this request; always exactly one `deny`. */
  options: PermissionOption[];
}

export interface PermissionOption {
  /** The adapter's own id, which maps back to the host's answer. */
  id: string;
  label: string;
  /**
   * `allow_session` lasts until the session ends; `allow_always` writes the host's settings, which wake never
   * offers the operator.
   */
  kind: 'allow_once' | 'allow_session' | 'allow_always' | 'deny';
}

export interface PermissionAnswer {
  optionId: string;
  /** With a deny: told to the agent, where the host can carry it. */
  message?: string;
}

/** Questions the agent puts to a person, each with the options it offers, if any. */
export interface HostQuestion {
  questions: Array<{ id: string; text: string; options: string[]; multiple: boolean }>;
}

export interface HostAnswer {
  /** Question id → the options picked, or the words written. */
  answers: Record<string, string[]>;
}
