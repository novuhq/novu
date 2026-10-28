import pc from 'picocolors';
import { version } from '../../package.json';
import { type ApiClient, createApiClient } from '../api/client';
import {
  errorCode,
  getLease,
  isKeyRejected,
  LISTENING_ELSEWHERE_CODE,
  type ListenHostId,
  type Listening,
  listeningOf,
  releaseLease,
  takeLease,
  waitForListenMessages,
} from '../api/listen';
import { info, promptLine, success, warn } from '../cli-io';
import { CLI_COMMAND, type CliConfig, loadConfig } from '../config';
import { detectHost } from '../host';
import { type AllowIo, type AllowOutcome, type AskedStore, askToAllow, fileAsked } from '../listen/allow';
import { computerName, ensureComputerId, projectLabel } from '../listen/computer';
import { type ForegroundStore, fileForeground, stopForeground } from '../listen/foreground';
import type { HostAdapter, HostProgram } from '../listen/host-adapter';
import { hostNameOf, isListenHostId, loadHost, startableHosts } from '../listen/hosts';
import { type ListenTiming, type LoopEnd, runListenLoop } from '../listen/loop';
import {
  type BackgroundCommand,
  backgroundCommand,
  isUnsupported,
  type ServiceSetup,
  serviceManager,
} from '../listen/service';
import {
  connectionOf,
  DEFAULT_LIMITS,
  fileState,
  type ListenState,
  logPath,
  newState,
  type StateStore,
  sameConnection,
} from '../listen/state';
import {
  backgroundSecretsWarning,
  backgroundSignInMessage,
  connectionChangedMessage,
  KEY_CHANGED_MESSAGE,
  movedMessage,
  NEEDS_ACCOUNT_MESSAGE,
  PAUSED_MESSAGE,
} from '../listen/words';
import { EXIT_DENIED, EXIT_ERROR, EXIT_GONE, EXIT_OK, EXIT_TIMEOUT, fail, formatRelativeTime } from '../output';
import { openScreen, type Screen } from '../screen/screen';
import { failOnScreen } from './failure';
import { handleError, parseDuration } from './interact';

export interface ListenOptions {
  /** Listens in this terminal only, instead of in the background. */
  foreground?: boolean;
  /** How long to wait for the operator's Allow when an agent ran the command. */
  timeout?: string;
  runsPerHour?: string;
  maxRun?: string;
  json?: boolean;
}

/** Everything `listen` reaches outside itself, so tests can stand in for each. */
export interface ListenDeps {
  store: StateStore;
  asked: AskedStore;
  /** A listener running in a terminal, which another one, or `listen stop`, stops first. */
  foreground: ForegroundStore;
  service: () => ServiceSetup;
  loadHost: (id: ListenHostId) => Promise<HostAdapter | null>;
  computerName: () => string;
  io: AllowIo;
  /** The CLI's own entry file and Node, for the background service to start. */
  script: string;
  nodePath: string;
  env: NodeJS.ProcessEnv;
  cwd: string;
  /** Lines for the person or agent that ran the command, and the loop's log. */
  out: (line: string) => void;
  timing?: Partial<ListenTiming>;
  /** Ends a loop: Ctrl-C in the foreground, the service manager stopping the background program. */
  signal?: AbortSignal;
  /** Called just before a foreground loop starts, which then prints its log. */
  beforeLoop?: () => unknown;
}

/** `listen claude-code`, `listen status`, `listen stop`, and `listen run`, which the background service starts. */
export async function listenCommand(what: string, options: ListenOptions): Promise<never> {
  const word = what.trim().toLowerCase();
  const turningOn = word !== 'run' && word !== 'status' && word !== 'stop';
  const screen = turningOn && personAtTerminal() ? await openScreen({ command: `listen ${word}` }) : null;
  let ended = false;
  const endScreen = async (emotion: 'happy' | 'asleep') => {
    if (screen && !ended) {
      ended = true;
      await screen.done(emotion);
    }
  };

  // Only a loop listens for Ctrl-C and the service manager: everywhere else they end the command as usual. A
  // foreground one does from just before its loop starts, so Ctrl-C while it asks ends the command, and nothing starts.
  const controller = new AbortController();
  const stopOnSignals = () => {
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.once(signal, () => controller.abort());
    }
  };
  if (word === 'run') {
    stopOnSignals();
  }

  try {
    const deps: ListenDeps = {
      ...realDeps(controller.signal),
      beforeLoop: () => {
        stopOnSignals();

        return endScreen('happy');
      },
    };
    const code =
      word === 'status'
        ? await listenStatus(options, deps)
        : word === 'stop'
          ? await listenStop(deps)
          : word === 'run'
            ? await listenRun(deps)
            : await listenOn(word, options, deps);

    await endScreen(code === EXIT_OK ? 'happy' : 'asleep');
    process.exit(code);
  } catch (err) {
    if (screen && !ended) {
      await failOnScreen(screen as Screen, err);
    }

    return handleError(err);
  }
}

/** A person typing in a terminal. An agent's command has no terminal, or carries its host's marks. */
function personAtTerminal(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY) && detectHost() === null;
}

function realDeps(signal: AbortSignal): ListenDeps {
  return {
    store: fileState,
    asked: fileAsked,
    foreground: fileForeground,
    service: () => serviceManager(),
    loadHost,
    computerName,
    io: { personAtTerminal: personAtTerminal(), prompt: promptLine, say: info },
    script: process.argv[1] ?? '',
    nodePath: process.execPath,
    env: process.env,
    cwd: process.cwd(),
    out: (line) => process.stdout.write(`${line}\n`),
    signal,
  };
}

/**
 * The connection saved on this computer, which is all the background program has: it never sees this
 * shell's variables. The key goes only to the API it was saved for: INBOX_API_URL could send it anywhere,
 * even before the operator is asked, and set by an agent it isn't the operator's choice.
 */
function savedConfig(env: NodeJS.ProcessEnv): CliConfig {
  const file = loadConfig();
  if (!file) {
    throw new Error(
      `Connect this computer first: \`${CLI_COMMAND} connect <agent> --code <code>\` with a code from agentinbox.md, or \`${CLI_COMMAND} login\`.`
    );
  }

  const key = env.INBOX_SECRET_KEY?.trim();
  if (key && key !== file.auth.secretKey) {
    warn('INBOX_SECRET_KEY is set in this shell, but listen uses the connection saved on this computer.');
  }
  const apiUrl = env.INBOX_API_URL?.trim().replace(/\/$/, '');
  if (apiUrl && apiUrl !== file.apiUrl.replace(/\/$/, '')) {
    warn(`INBOX_API_URL is set in this shell, but listen uses the API saved on this computer: ${file.apiUrl}.`);
  }

  return file;
}

function clientFor(config: CliConfig, host: ListenHostId): ApiClient {
  return createApiClient({
    apiUrl: config.apiUrl,
    secretKey: config.auth.secretKey,
    keylessIdentifier: config.auth.mode === 'keyless' ? config.auth.keylessIdentifier : undefined,
    // The listener's calls count as checks by the host it starts, wherever `listen` was started from.
    asHost: host,
  });
}

/** Any `401` means the key was regenerated on agentinbox.md: say so, in the contract's words. */
function rethrowKey(err: unknown): never {
  throw isKeyRejected(err) ? new Error(KEY_CHANGED_MESSAGE) : err;
}

function positive(raw: string | undefined, label: string): number | undefined {
  if (raw === undefined) {
    return undefined;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    fail(`${label} must be a positive whole number.`);
  }

  return value;
}

/** "2h", "5m": how long ago, without the "ago". */
function since(iso: string): string {
  return formatRelativeTime(iso).replace(/ ago$/, '');
}

/** What `listen <host>` works with, once it has checked it can go ahead. */
interface ListenPlan {
  host: HostAdapter;
  limits: ListenState['limits'];
  config: CliConfig;
  program: HostProgram;
  version?: string;
  warnings: string[];
  service: ServiceSetup;
  /** How the background program starts, unless it listens in this terminal. */
  background?: BackgroundCommand;
  project: string;
  label: string;
  computer: string;
  computerId: string;
  client: ApiClient;
  /** Where the agent is listening now, when that's another computer or another host here. */
  elsewhere: Listening | null;
  /** It listens here already, for the same host and project. */
  listeningHere: boolean;
  previous: ListenState | null;
}

/** Every check before anything is asked: the host, the connection, the host's program, the service manager. */
async function planListen(hostInput: string, options: ListenOptions, deps: ListenDeps): Promise<ListenPlan> {
  const host = await hostFor(hostInput, deps);
  const limits = {
    runsPerHour: positive(options.runsPerHour, '--runs-per-hour') ?? DEFAULT_LIMITS.runsPerHour,
    maxRunSeconds: options.maxRun ? parseDuration(options.maxRun) : DEFAULT_LIMITS.maxRunSeconds,
  };
  const config = savedConfig(deps.env);
  if (config.auth.mode === 'keyless') {
    throw new Error(NEEDS_ACCOUNT_MESSAGE);
  }
  if (!config.subscriberId) {
    throw new Error(
      `Listening asks you before ${host.name} does what its settings don’t allow, and this computer doesn’t know who you are yet. Run \`${CLI_COMMAND} setup\`, then listen again.`
    );
  }

  const project = deps.cwd;
  const checked = host.check(project, deps.env);
  if (!checked.ok) {
    throw new Error(checked.message);
  }

  const service = deps.service();
  if (!options.foreground && isUnsupported(service)) {
    throw new Error(service.unsupported);
  }

  // The background program gets only some of this shell's variables: the host has to work with those alone.
  const background = options.foreground ? undefined : backgroundFor(host, project, deps);
  const warnings = [...checked.warnings];
  if (background) {
    const secrets = host.signInSecretsIn(deps.env);
    const there = host.check(project, background.env);
    if (!there.ok) {
      throw new Error(backgroundSignInMessage({ hostName: host.name, hostId: host.id, secrets, why: there.message }));
    }
    if (secrets.length > 0) {
      warnings.push(backgroundSecretsWarning(host.name, secrets));
    }
  }

  const computerId = ensureComputerId(config);
  const client = clientFor(config, host.id);
  const { listening: holder, paused } = await getLease(client, config.relayAgentIdentifier).catch(rethrowKey);
  if (paused) {
    throw new Error(PAUSED_MESSAGE);
  }
  // The holder is a computer and a host: another host on this computer counts as elsewhere too.
  const heldHere = holder?.computerId === computerId && holder.host === host.id;
  const previous = deps.store.load();
  // Sessions belong to this project's conversations, with this agent: another one starts them anew.
  const same =
    previous?.host === host.id &&
    previous.project === project &&
    sameConnection(previous.connection, connectionOf(config));

  return {
    host,
    limits,
    config,
    program: checked.program,
    version: checked.version,
    warnings,
    service,
    background,
    project,
    label: projectLabel(project),
    computer: deps.computerName(),
    computerId,
    client,
    elsewhere: holder && !heldHere ? holder : null,
    listeningHere: Boolean(same && previous?.allowedAt && !previous.stopped && heldHere),
    previous: same ? previous : null,
  };
}

/** How the background program starts: with the host's own settings from this shell, never its secrets. */
function backgroundFor(host: HostAdapter, project: string, deps: ListenDeps): BackgroundCommand {
  return backgroundCommand({
    script: deps.script,
    nodePath: deps.nodePath,
    version,
    env: deps.env,
    hostSettings: host.settingsIn(deps.env),
    project,
    logFile: logPath(),
    description: `Listens for Agent Inbox messages for ${host.name}`,
  });
}

async function hostFor(hostInput: string, deps: ListenDeps): Promise<HostAdapter> {
  const supported = startableHosts();
  if (!isListenHostId(hostInput)) {
    throw new Error(
      `Listening starts a host on this computer: ${supported.join(', ')}. For example: ${CLI_COMMAND} listen ${supported[0]}`
    );
  }

  const host = await deps.loadHost(hostInput);
  if (!host) {
    throw new Error(
      `Listening doesn’t start ${hostNameOf(hostInput)} yet, only ${supported.map(hostNameOf).join(', ')}.`
    );
  }

  return host;
}

/** What the command says and exits with when the answer isn't an Allow; undefined for an Allow. */
function notAllowed(outcome: AllowOutcome, plan: ListenPlan, deps: ListenDeps): number | undefined {
  switch (outcome) {
    case 'denied':
      deps.out(`Not listening: ${deps.io.personAtTerminal ? 'you said no' : 'your operator said no'}.`);

      return EXIT_DENIED;
    case 'expired':
      deps.out('The question expired without an answer, so it isn’t listening.');

      return EXIT_GONE;
    case 'pending':
      deps.out(
        `Your operator hasn’t answered yet, so it isn’t listening. Run \`${CLI_COMMAND} listen ${plan.host.id}\` again to go on waiting for the same answer.`
      );

      return EXIT_TIMEOUT;
    default:
      return undefined;
  }
}

/**
 * Once allowed: what was allowed is kept, the lease is taken (over, when the operator agreed to move it), and
 * where waiting starts is kept too, before anything says it is listening: what is sent while the background program
 * starts isn't missed.
 */
async function takeIt(plan: ListenPlan, deps: ListenDeps): Promise<ListenState> {
  // A listener already running here stops first, in a terminal or in the background: it writes the same state, and it
  // may be for another project.
  await stopForeground(deps.foreground);
  if (!isUnsupported(plan.service) && plan.service.isInstalled()) {
    plan.service.uninstall();
  }

  const state: ListenState = {
    ...newState({
      host: plan.host.id,
      project: plan.project,
      program: { ...plan.program, args: [...plan.program.args] },
      limits: plan.limits,
    }),
    connection: connectionOf(plan.config),
    ...(plan.previous ? { sessions: plan.previous.sessions, own: plan.previous.own } : {}),
    allowedAt: new Date().toISOString(),
  };
  deps.store.save(state);

  try {
    await takeLease(plan.client, {
      computerId: plan.computerId,
      computerName: plan.computer,
      host: plan.host.id,
      project: plan.label,
      takeOver: Boolean(plan.elsewhere),
      agentIdentifier: plan.config.relayAgentIdentifier,
    });
    const from = await waitForListenMessages(plan.client, {
      computerId: plan.computerId,
      host: plan.host.id,
      wait: 0,
      agentIdentifier: plan.config.relayAgentIdentifier,
    });
    const started: ListenState = { ...state, cursor: from.next, queue: from.data };
    deps.store.save(started);

    return started;
  } catch (err) {
    await undoStart(plan, deps, state);
    if (isKeyRejected(err)) {
      throw new Error(KEY_CHANGED_MESSAGE);
    }
    if (errorCode(err) === LISTENING_ELSEWHERE_CODE) {
      throw new Error(
        movedMessage(listeningOf(err), hostNameOf, { computerId: plan.computerId, hostName: plan.host.name })
      );
    }
    throw err;
  }
}

/** A start that failed leaves nothing behind: no lease, no service, nothing allowed. The next try asks again. */
async function undoStart(plan: ListenPlan, deps: ListenDeps, state: ListenState): Promise<void> {
  if (!isUnsupported(plan.service)) {
    plan.service.uninstall();
  }
  await releaseLease(plan.client, {
    computerId: plan.computerId,
    host: plan.host.id,
    agentIdentifier: plan.config.relayAgentIdentifier,
  }).catch(() => false);
  deps.store.save({ ...state, allowedAt: undefined });
}

/** The background program, from now on and after every restart. */
function startBackground(plan: ListenPlan, deps: ListenDeps): number {
  const { service, host } = plan;
  if (isUnsupported(service)) {
    throw new Error(service.unsupported);
  }

  service.install(plan.background ?? backgroundFor(host, plan.project, deps));

  success(`Listening on ${plan.computer}, for ${host.name} in ${plan.label}.`);
  info(
    `Messages from you, and from the contacts it listens to, start ${host.name} here. It asks you before anything its settings don’t allow.`
  );
  if (service.kind === 'systemd') {
    info(`To keep listening while you’re logged out too: ${pc.bold('loginctl enable-linger')}`);
  }
  info(`See it: ${pc.bold(`${CLI_COMMAND} listen status`)} · stop it: ${pc.bold(`${CLI_COMMAND} listen stop`)}`);

  return EXIT_OK;
}

/**
 * `listen <host>`: asks the operator, then listens on this computer, starting the host in this folder: in the
 * background, where it starts again after a restart, or in this terminal with `--foreground`.
 */
export async function listenOn(hostInput: string, options: ListenOptions, deps: ListenDeps): Promise<number> {
  const plan = await planListen(hostInput, options, deps);
  const { host, service } = plan;

  if (plan.listeningHere && !options.foreground && !isUnsupported(service) && service.isInstalled()) {
    success(`Listening on ${plan.computer} already, for ${host.name} in ${plan.label}.`);
    info(`See it: ${pc.bold(`${CLI_COMMAND} listen status`)} · stop it: ${pc.bold(`${CLI_COMMAND} listen stop`)}`);

    return EXIT_OK;
  }

  if (plan.version) {
    success(`${host.name} ${plan.version} is on this computer.`);
  }
  // Said before the question, so it is part of what the operator agrees to.
  if (deps.io.personAtTerminal) {
    for (const warning of plan.warnings) {
      warn(warning);
    }
  }

  const outcome = await askToAllow({
    client: plan.client,
    agentIdentifier: plan.config.relayAgentIdentifier,
    operatorId: plan.config.subscriberId,
    hostName: host.name,
    computerId: plan.computerId,
    computerName: plan.computer,
    project: plan.label,
    elsewhere: plan.elsewhere,
    notes: plan.warnings,
    asked: deps.asked,
    timeoutSeconds: options.timeout ? parseDuration(options.timeout) : undefined,
    io: deps.io,
  });
  const refused = notAllowed(outcome, plan, deps);
  if (refused !== undefined) {
    return refused;
  }

  const state = await takeIt(plan, deps);

  if (!options.foreground) {
    try {
      return startBackground(plan, deps);
    } catch (err) {
      // On macOS a failed bootstrap leaves the service's file: it, and the lease, go too.
      await undoStart(plan, deps, state);
      throw err;
    }
  }

  success(`Listening on ${plan.computer}, for ${host.name} in ${plan.label}, while this terminal stays open.`);
  info(`Messages from you, and from the contacts it listens to, start ${host.name} here. Ctrl-C stops it.`);
  await deps.beforeLoop?.();
  deps.foreground.claim(process.pid);
  try {
    const end = await loopFor(plan.config, plan.computerId, plan.computer, host, deps);

    return end.reason === 'signal' ? EXIT_OK : EXIT_ERROR;
  } finally {
    deps.foreground.release(process.pid);
  }
}

function loopFor(
  config: CliConfig,
  computerId: string,
  computer: string,
  host: HostAdapter,
  deps: ListenDeps
): Promise<LoopEnd> {
  return runListenLoop({
    client: clientFor(config, host.id),
    agentIdentifier: config.relayAgentIdentifier,
    operatorId: config.subscriberId ?? '',
    computerId,
    computerName: computer,
    host,
    store: deps.store,
    timing: deps.timing,
    signal: deps.signal,
    log: (line) => deps.out(`${new Date().toISOString()} ${line}`),
    savedConnection: () => {
      const saved = loadConfig();

      return saved ? connectionOf(saved) : null;
    },
  });
}

/**
 * `listen run`: the background program the service starts, at login and after a crash. It only runs what the
 * operator allowed. Whenever it stops on purpose or for good, it exits cleanly, so it isn't started again.
 */
export async function listenRun(deps: ListenDeps): Promise<number> {
  const state = deps.store.load();
  if (!state?.allowedAt) {
    deps.out(`Listening isn’t turned on here. Turn it on with: ${CLI_COMMAND} listen claude-code`);

    return EXIT_OK;
  }

  if (state.stopped) {
    deps.out(`Stopped: ${state.stopped.message}`);

    return EXIT_OK;
  }

  const host = await deps.loadHost(state.host);
  const file = loadConfig();
  if (!host || !file?.computerId || !file.subscriberId) {
    deps.out(`Listening can’t run here any more. Turn it on again with: ${CLI_COMMAND} listen ${state.host}`);

    return EXIT_OK;
  }

  // What was queued and allowed belongs to the connection it was turned on for, never to whichever is saved now.
  if (!sameConnection(state.connection, connectionOf(file))) {
    const message = connectionChangedMessage(state.host);
    deps.store.save({ ...state, stopped: { reason: 'connection_changed', message, at: new Date().toISOString() } });
    deps.out(`Stopped: ${message}`);

    return EXIT_OK;
  }

  // The host may have moved, gone or signed out since it was turned on.
  const checked = host.check(state.project, deps.env);
  if (!checked.ok) {
    deps.store.save({
      ...state,
      stopped: { reason: 'host_missing', message: checked.message, at: new Date().toISOString() },
    });
    deps.out(`Stopped: ${checked.message}`);

    return EXIT_OK;
  }
  if (checked.program.command !== state.program.command) {
    deps.store.save({ ...state, program: { ...checked.program, args: [...checked.program.args] } });
  }

  await loopFor(file, file.computerId, deps.computerName(), host, deps);

  return EXIT_OK;
}

/** What `listen status` says: where the agent is listening, and what this computer does. */
interface StatusFacts {
  listening: Listening | null;
  /** The operator paused the agent on agentinbox.md: nothing starts it until it is resumed. */
  paused: boolean;
  here: boolean;
  state: ListenState | null;
  service: ServiceSetup;
  installed: boolean;
  running: boolean | undefined;
  sessions: number;
  lastRun?: string;
}

async function statusFacts(deps: ListenDeps): Promise<StatusFacts> {
  const config = savedConfig(deps.env);
  const state = deps.store.load();
  const client = clientFor(config, state?.host ?? 'claude-code');
  const { listening, paused } = await getLease(client, config.relayAgentIdentifier).catch(rethrowKey);
  const service = deps.service();
  const installed = !isUnsupported(service) && service.isInstalled();
  const sessions = state
    ? Object.values(state.sessions)
        .map((session) => session.lastRunAt)
        .sort()
    : [];

  return {
    listening,
    paused,
    here: Boolean(listening && config.computerId && listening.computerId === config.computerId),
    state,
    service,
    installed,
    running: installed && !isUnsupported(service) ? service.isRunning() : false,
    sessions: sessions.length,
    lastRun: sessions[sessions.length - 1],
  };
}

function statusJson(facts: StatusFacts): Record<string, unknown> {
  const { state, service } = facts;

  return {
    listening: facts.listening,
    ...(facts.paused ? { paused: true } : {}),
    thisComputer: {
      listeningHere: facts.here,
      host: state?.allowedAt ? state.host : null,
      project: state?.allowedAt ? projectLabel(state.project) : null,
      background:
        facts.installed && !isUnsupported(service) ? { kind: service.kind, running: facts.running ?? null } : null,
      stopped: state?.stopped ?? null,
      sessions: facts.sessions,
      lastRunAt: facts.lastRun ?? null,
      log: logPath(),
    },
  };
}

/** What this computer does about it, in a line. */
function thisComputerLine(facts: StatusFacts): string | undefined {
  const { state, service } = facts;
  if (state?.stopped) {
    return `This computer stopped ${formatRelativeTime(state.stopped.at)}: ${state.stopped.message}`;
  }
  if (facts.installed && state?.allowedAt && !isUnsupported(service)) {
    const notRunning = facts.running === false ? ', but it isn’t running right now' : '';

    return `This computer listens for ${hostNameOf(state.host)} in ${projectLabel(state.project)}, in the background (${service.kind})${notRunning}.`;
  }

  return facts.here ? undefined : `This computer isn’t listening. To start: ${CLI_COMMAND} listen claude-code`;
}

/** `listen status`: where the agent is listening, and what this computer does about it. */
export async function listenStatus(options: Pick<ListenOptions, 'json'>, deps: ListenDeps): Promise<number> {
  const facts = await statusFacts(deps);
  if (options.json) {
    deps.out(JSON.stringify(statusJson(facts), null, 2));

    return EXIT_OK;
  }

  if (facts.paused) {
    deps.out(PAUSED_MESSAGE);
  }
  // Paused, a lease lapses within minutes: "not listening anywhere" would say nothing the line above doesn't.
  if (facts.listening || !facts.paused) {
    deps.out(describeListening(facts.listening, facts.here));
  }
  const here = thisComputerLine(facts);
  if (here) {
    deps.out(here);
  }
  if (facts.sessions > 0) {
    const kept = facts.sessions === 1 ? 'conversation has' : 'conversations have';
    const last = facts.lastRun ? `; the last run started ${formatRelativeTime(facts.lastRun)}` : '';
    deps.out(`${facts.sessions} ${kept} a session${last}.`);
  }
  deps.out(`Log: ${logPath()}`);

  return EXIT_OK;
}

function describeListening(listening: Listening | null, here: boolean): string {
  if (!listening) {
    return 'Not listening anywhere.';
  }

  return `Listening on ${listening.computerName}${here ? ' (this computer)' : ''}: ${hostNameOf(listening.host)}${listening.project ? `, in ${listening.project}` : ''}, for ${since(listening.since)} now.`;
}

/** `listen stop`: this computer doesn't listen any more. Another computer's listener is left alone. */
export async function listenStop(deps: ListenDeps): Promise<number> {
  const config = savedConfig(deps.env);
  // One in a terminal ends first, so it can't write the state this resets.
  const stoppedTerminal = await stopForeground(deps.foreground);
  const state = deps.store.load();
  const service = deps.service();
  const removed = (!isUnsupported(service) && service.uninstall()) || stoppedTerminal;
  const host = state?.host ?? 'claude-code';
  const client = clientFor(config, host);

  // Only this computer's own lease, for the host it listens for, is let go of, also while the agent is paused.
  // It stops here either way.
  const released = config.computerId
    ? await releaseLease(client, {
        computerId: config.computerId,
        host,
        agentIdentifier: config.relayAgentIdentifier,
      }).catch(() => undefined)
    : false;

  if (state) {
    // The sessions stay until their conversations are resolved; what was allowed and where it got to don't.
    deps.store.save({ ...newState(state), connection: state.connection, sessions: state.sessions, own: state.own });
  }
  deps.asked.save(null);

  const hostName = hostNameOf(host);
  deps.out(
    removed || released
      ? `This computer isn’t listening for ${hostName} any more.`
      : 'Nothing was listening on this computer.'
  );
  if (released === undefined) {
    deps.out('Agent Inbox couldn’t be told just now: the lease lapses within 3 minutes.');
  }

  const listening = (await getLease(client, config.relayAgentIdentifier).catch(() => null))?.listening;
  if (listening && listening.computerId !== config.computerId) {
    deps.out(`It’s listening on ${listening.computerName}: run \`${CLI_COMMAND} listen stop\` there to stop it.`);
  }

  return EXIT_OK;
}
