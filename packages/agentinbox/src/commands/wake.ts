import pc from 'picocolors';
import { version } from '../../package.json';
import { type ApiClient, createApiClient } from '../api/client';
import {
  AWAKE_ELSEWHERE_CODE,
  type Awake,
  awakeOf,
  errorCode,
  getLease,
  isKeyRejected,
  releaseLease,
  takeLease,
  type WakeHostId,
} from '../api/wake';
import { info, promptLine, success, warn } from '../cli-io';
import { CLI_COMMAND, type CliConfig, loadConfig, resolveConfig } from '../config';
import { detectHost } from '../host';
import { EXIT_DENIED, EXIT_ERROR, EXIT_GONE, EXIT_OK, EXIT_TIMEOUT, fail, formatRelativeTime } from '../output';
import { openScreen, type Screen } from '../screen/screen';
import { type AllowIo, type AllowOutcome, type AskedStore, askToAllow, fileAsked } from '../wake/allow';
import { computerName, ensureComputerId, projectLabel } from '../wake/computer';
import type { HostAdapter, HostProgram } from '../wake/host-adapter';
import { isWakeHostId, loadHost, wakeableHosts, wakeHostName } from '../wake/hosts';
import { type LoopEnd, runWakeLoop, type WakeTiming } from '../wake/loop';
import { backgroundCommand, isUnsupported, type ServiceSetup, serviceManager } from '../wake/service';
import { DEFAULT_LIMITS, fileState, logPath, newState, type StateStore, type WakeState } from '../wake/state';
import { KEY_CHANGED_MESSAGE, movedMessage, NEEDS_ACCOUNT_MESSAGE, PAUSED_MESSAGE } from '../wake/words';
import { failOnScreen } from './failure';
import { handleError, parseDuration } from './interact';

export interface WakeOptions {
  /** Keeps it awake in this terminal only, instead of in the background. */
  foreground?: boolean;
  /** How long to wait for the operator's Allow when an agent ran the command. */
  timeout?: string;
  wakesPerHour?: string;
  maxRun?: string;
  json?: boolean;
}

/** Everything `wake` reaches outside itself, so tests can stand in for each. */
export interface WakeDeps {
  store: StateStore;
  asked: AskedStore;
  service: () => ServiceSetup;
  loadHost: (id: WakeHostId) => Promise<HostAdapter | null>;
  computerName: () => string;
  io: AllowIo;
  /** The CLI's own entry file and Node, for the background service to start. */
  script: string;
  nodePath: string;
  env: NodeJS.ProcessEnv;
  cwd: string;
  /** Lines for the person or agent that ran the command, and the loop's log. */
  out: (line: string) => void;
  timing?: Partial<WakeTiming>;
  /** Ends a loop: Ctrl-C in the foreground, the service manager stopping the background program. */
  signal?: AbortSignal;
  /** Called just before a foreground loop starts, which then prints its log. */
  beforeLoop?: () => unknown;
}

/** `wake claude-code`, `wake status`, `wake stop`, and `wake run`, which the background service starts. */
export async function wakeCommand(what: string, options: WakeOptions): Promise<never> {
  const word = what.trim().toLowerCase();
  const turningOn = word !== 'run' && word !== 'status' && word !== 'stop';
  const screen = turningOn && personAtTerminal() ? await openScreen({ command: `wake ${word}` }) : null;
  let ended = false;
  const endScreen = async (emotion: 'happy' | 'asleep') => {
    if (screen && !ended) {
      ended = true;
      await screen.done(emotion);
    }
  };

  // Only a loop listens for Ctrl-C and the service manager: everywhere else they end the command as usual.
  const controller = new AbortController();
  if (word === 'run' || options.foreground) {
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.once(signal, () => controller.abort());
    }
  }

  try {
    const deps: WakeDeps = { ...realDeps(controller.signal), beforeLoop: () => endScreen('happy') };
    const code =
      word === 'status'
        ? await wakeStatus(options, deps)
        : word === 'stop'
          ? await wakeStop(deps)
          : word === 'run'
            ? await wakeRun(deps)
            : await wakeOn(word, options, deps);

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

function realDeps(signal: AbortSignal): WakeDeps {
  return {
    store: fileState,
    asked: fileAsked,
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
 * shell's variables. `file` is as saved; `config` also has the API that INBOX_API_URL names, which the
 * background program is given too.
 */
function savedConfig(env: NodeJS.ProcessEnv): { file: CliConfig; config: CliConfig } {
  const file = loadConfig();
  if (!file) {
    throw new Error(
      `Connect this computer first: \`${CLI_COMMAND} connect <agent> --code <code>\` with a code from agentinbox.md, or \`${CLI_COMMAND} login\`.`
    );
  }

  const key = env.INBOX_SECRET_KEY?.trim();
  if (key && key !== file.auth.secretKey) {
    warn('INBOX_SECRET_KEY is set in this shell, but wake uses the connection saved on this computer.');
  }

  return { file, config: { ...file, apiUrl: resolveConfig().apiUrl } };
}

function clientFor(config: CliConfig, host: WakeHostId): ApiClient {
  return createApiClient({
    apiUrl: config.apiUrl,
    secretKey: config.auth.secretKey,
    keylessIdentifier: config.auth.mode === 'keyless' ? config.auth.keylessIdentifier : undefined,
    // Wake's calls count as checks by the host it wakes, wherever `wake` was started from.
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

/** What `wake <host>` works with, once it has checked it can go ahead. */
interface WakePlan {
  host: HostAdapter;
  limits: WakeState['limits'];
  config: CliConfig;
  program: HostProgram;
  version?: string;
  warnings: string[];
  service: ServiceSetup;
  project: string;
  label: string;
  computer: string;
  computerId: string;
  client: ApiClient;
  /** Where the agent is awake now, when that's another computer or another host here. */
  elsewhere: Awake | null;
  /** Wake runs here already, for the same host and project. */
  awakeHere: boolean;
  previous: WakeState | null;
}

/** Every check before anything is asked: the host, the connection, the host's program, the service manager. */
async function planWake(hostInput: string, options: WakeOptions, deps: WakeDeps): Promise<WakePlan> {
  const host = await hostFor(hostInput, deps);
  const limits = {
    wakesPerHour: positive(options.wakesPerHour, '--wakes-per-hour') ?? DEFAULT_LIMITS.wakesPerHour,
    maxRunSeconds: options.maxRun ? parseDuration(options.maxRun) : DEFAULT_LIMITS.maxRunSeconds,
  };
  const { file, config } = savedConfig(deps.env);
  if (config.auth.mode === 'keyless') {
    throw new Error(NEEDS_ACCOUNT_MESSAGE);
  }
  if (!config.subscriberId) {
    throw new Error(
      `Wake asks you before ${host.name} does what its settings don’t allow, and this computer doesn’t know who you are yet. Run \`${CLI_COMMAND} setup\`, then wake again.`
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

  const computerId = ensureComputerId(file);
  const client = clientFor(config, host.id);
  const { awake: holder, paused } = await getLease(client, config.relayAgentIdentifier).catch(rethrowKey);
  if (paused) {
    throw new Error(PAUSED_MESSAGE);
  }
  // The holder is a computer and a host: another host on this computer counts as elsewhere too.
  const heldHere = holder?.computerId === computerId && holder.host === host.id;
  const previous = deps.store.load();
  const same = previous?.host === host.id && previous.project === project;

  return {
    host,
    limits,
    config,
    program: checked.program,
    version: checked.version,
    warnings: checked.warnings,
    service,
    project,
    label: projectLabel(project),
    computer: deps.computerName(),
    computerId,
    client,
    elsewhere: holder && !heldHere ? holder : null,
    awakeHere: Boolean(same && previous?.allowedAt && !previous.stopped && heldHere),
    previous: same ? previous : null,
  };
}

async function hostFor(hostInput: string, deps: WakeDeps): Promise<HostAdapter> {
  const supported = wakeableHosts();
  if (!isWakeHostId(hostInput)) {
    throw new Error(
      `Wake starts a host on this computer: ${supported.join(', ')}. For example: ${CLI_COMMAND} wake ${supported[0]}`
    );
  }

  const host = await deps.loadHost(hostInput);
  if (!host) {
    throw new Error(
      `Wake doesn’t start ${wakeHostName(hostInput)} yet, only ${supported.map(wakeHostName).join(', ')}.`
    );
  }

  return host;
}

/** What the command says and exits with when the answer isn't an Allow; undefined for an Allow. */
function notAllowed(outcome: AllowOutcome, plan: WakePlan, deps: WakeDeps): number | undefined {
  switch (outcome) {
    case 'denied':
      deps.out(`Not kept awake: ${deps.io.personAtTerminal ? 'you said no' : 'your operator said no'}.`);

      return EXIT_DENIED;
    case 'expired':
      deps.out('The question expired without an answer, so nothing is kept awake.');

      return EXIT_GONE;
    case 'pending':
      deps.out(
        `Your operator hasn’t answered yet, so nothing is kept awake. Run \`${CLI_COMMAND} wake ${plan.host.id}\` again to go on waiting for the same answer.`
      );

      return EXIT_TIMEOUT;
    default:
      return undefined;
  }
}

/** Once allowed: what was allowed is kept, and the lease is taken (over, when the operator agreed to move it). */
async function takeIt(plan: WakePlan, deps: WakeDeps): Promise<void> {
  // A wake already running here stops first: it writes the same state, and it may be for another project.
  if (!isUnsupported(plan.service) && plan.service.isInstalled()) {
    plan.service.uninstall();
  }

  const state: WakeState = {
    ...newState({
      host: plan.host.id,
      project: plan.project,
      program: { ...plan.program, args: [...plan.program.args] },
      limits: plan.limits,
    }),
    // Sessions belong to this project's conversations; another project starts them anew.
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
  } catch (err) {
    deps.store.save({ ...state, allowedAt: undefined });
    if (isKeyRejected(err)) {
      throw new Error(KEY_CHANGED_MESSAGE);
    }
    if (errorCode(err) === AWAKE_ELSEWHERE_CODE) {
      throw new Error(
        movedMessage(awakeOf(err), wakeHostName, { computerId: plan.computerId, hostName: plan.host.name })
      );
    }
    throw err;
  }
}

/** The background program, from now on and after every restart. */
function startBackground(plan: WakePlan, deps: WakeDeps): number {
  const { service, host } = plan;
  if (isUnsupported(service)) {
    throw new Error(service.unsupported);
  }

  service.install(
    backgroundCommand({
      script: deps.script,
      nodePath: deps.nodePath,
      version,
      env: deps.env,
      project: plan.project,
      logFile: logPath(),
      description: `Keeps ${host.name} awake for Agent Inbox`,
    })
  );

  success(`${host.name} is awake on ${plan.computer}, in ${plan.label}.`);
  info(
    'Messages from you, and from contacts you let wake it, start it here. It asks you before anything its settings don’t allow.'
  );
  if (service.kind === 'systemd') {
    info(`To keep it awake while you’re logged out too: ${pc.bold('loginctl enable-linger')}`);
  }
  info(`See it: ${pc.bold(`${CLI_COMMAND} wake status`)} · stop it: ${pc.bold(`${CLI_COMMAND} wake stop`)}`);

  return EXIT_OK;
}

/**
 * `wake <host>`: asks the operator, then keeps the host awake on this computer, for this folder: in the
 * background, where it starts again after a restart, or in this terminal with `--foreground`.
 */
export async function wakeOn(hostInput: string, options: WakeOptions, deps: WakeDeps): Promise<number> {
  const plan = await planWake(hostInput, options, deps);
  const { host, service } = plan;

  if (plan.awakeHere && !options.foreground && !isUnsupported(service) && service.isInstalled()) {
    success(`${host.name} is awake on ${plan.computer} already, in ${plan.label}.`);
    info(`See it: ${pc.bold(`${CLI_COMMAND} wake status`)} · stop it: ${pc.bold(`${CLI_COMMAND} wake stop`)}`);

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

  await takeIt(plan, deps);

  if (!options.foreground) {
    return startBackground(plan, deps);
  }

  success(`${host.name} is awake on ${plan.computer}, in ${plan.label}, while this terminal stays open.`);
  info('Messages from you, and from contacts you let wake it, start it here. Ctrl-C stops it.');
  await deps.beforeLoop?.();
  const end = await loopFor(plan.config, plan.computerId, plan.computer, host, deps);

  return end.reason === 'signal' ? EXIT_OK : EXIT_ERROR;
}

function loopFor(
  config: CliConfig,
  computerId: string,
  computer: string,
  host: HostAdapter,
  deps: WakeDeps
): Promise<LoopEnd> {
  return runWakeLoop({
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
  });
}

/**
 * `wake run`: the background program the service starts, at login and after a crash. It only runs what the
 * operator allowed. Whenever it stops on purpose or for good, it exits cleanly, so it isn't started again.
 */
export async function wakeRun(deps: WakeDeps): Promise<number> {
  const state = deps.store.load();
  if (!state?.allowedAt) {
    deps.out(`Wake isn’t turned on here. Turn it on with: ${CLI_COMMAND} wake claude-code`);

    return EXIT_OK;
  }

  if (state.stopped) {
    deps.out(`Stopped: ${state.stopped.message}`);

    return EXIT_OK;
  }

  const host = await deps.loadHost(state.host);
  const file = loadConfig();
  if (!host || !file?.computerId || !file.subscriberId) {
    deps.out(`Wake can’t run here any more. Turn it on again with: ${CLI_COMMAND} wake ${state.host}`);

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

  const config = { ...file, apiUrl: resolveConfig().apiUrl };
  await loopFor(config, file.computerId, deps.computerName(), host, deps);

  return EXIT_OK;
}

/** What `wake status` says: where the agent is awake, and what this computer does. */
interface StatusFacts {
  awake: Awake | null;
  /** The operator paused the agent on agentinbox.md: nothing wakes it until it is resumed. */
  paused: boolean;
  here: boolean;
  state: WakeState | null;
  service: ServiceSetup;
  installed: boolean;
  running: boolean | undefined;
  sessions: number;
  lastWake?: string;
}

async function statusFacts(deps: WakeDeps): Promise<StatusFacts> {
  const { config } = savedConfig(deps.env);
  const state = deps.store.load();
  const client = clientFor(config, state?.host ?? 'claude-code');
  const { awake, paused } = await getLease(client, config.relayAgentIdentifier).catch(rethrowKey);
  const service = deps.service();
  const installed = !isUnsupported(service) && service.isInstalled();
  const sessions = state
    ? Object.values(state.sessions)
        .map((session) => session.lastWakeAt)
        .sort()
    : [];

  return {
    awake,
    paused,
    here: Boolean(awake && config.computerId && awake.computerId === config.computerId),
    state,
    service,
    installed,
    running: installed && !isUnsupported(service) ? service.isRunning() : false,
    sessions: sessions.length,
    lastWake: sessions[sessions.length - 1],
  };
}

function statusJson(facts: StatusFacts): Record<string, unknown> {
  const { state, service } = facts;

  return {
    awake: facts.awake,
    ...(facts.paused ? { paused: true } : {}),
    thisComputer: {
      awakeHere: facts.here,
      host: state?.allowedAt ? state.host : null,
      project: state?.allowedAt ? projectLabel(state.project) : null,
      background:
        facts.installed && !isUnsupported(service) ? { kind: service.kind, running: facts.running ?? null } : null,
      stopped: state?.stopped ?? null,
      sessions: facts.sessions,
      lastWakeAt: facts.lastWake ?? null,
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

    return `This computer keeps ${wakeHostName(state.host)} awake for ${projectLabel(state.project)}, in the background (${service.kind})${notRunning}.`;
  }

  return facts.here ? undefined : `This computer doesn’t keep it awake. To start: ${CLI_COMMAND} wake claude-code`;
}

/** `wake status`: where the agent is awake, and what this computer does about it. */
export async function wakeStatus(options: Pick<WakeOptions, 'json'>, deps: WakeDeps): Promise<number> {
  const facts = await statusFacts(deps);
  if (options.json) {
    deps.out(JSON.stringify(statusJson(facts), null, 2));

    return EXIT_OK;
  }

  if (facts.paused) {
    deps.out(PAUSED_MESSAGE);
  }
  // Paused, a lease lapses within minutes: "not awake anywhere" would say nothing the line above doesn't.
  if (facts.awake || !facts.paused) {
    deps.out(describeAwake(facts.awake, facts.here));
  }
  const here = thisComputerLine(facts);
  if (here) {
    deps.out(here);
  }
  if (facts.sessions > 0) {
    const kept = facts.sessions === 1 ? 'conversation has' : 'conversations have';
    const last = facts.lastWake ? `; the last wake was ${formatRelativeTime(facts.lastWake)}` : '';
    deps.out(`${facts.sessions} ${kept} a session${last}.`);
  }
  deps.out(`Log: ${logPath()}`);

  return EXIT_OK;
}

function describeAwake(awake: Awake | null, here: boolean): string {
  if (!awake) {
    return 'Not awake anywhere.';
  }

  return `Awake on ${awake.computerName}${here ? ' (this computer)' : ''}: ${wakeHostName(awake.host)}${awake.project ? `, in ${awake.project}` : ''}, for ${since(awake.since)} now.`;
}

/** `wake stop`: the agent isn't kept awake here any more. Another computer's wake is left alone. */
export async function wakeStop(deps: WakeDeps): Promise<number> {
  const { config } = savedConfig(deps.env);
  const state = deps.store.load();
  const service = deps.service();
  const removed = !isUnsupported(service) && service.uninstall();
  const host = state?.host ?? 'claude-code';
  const client = clientFor(config, host);

  // Only this computer's own lease, for the host it keeps awake, is let go of, also while the agent is paused.
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
    deps.store.save({ ...newState(state), sessions: state.sessions, own: state.own });
  }
  deps.asked.save(null);

  const hostName = wakeHostName(host);
  deps.out(
    removed || released
      ? `${hostName} isn’t kept awake on this computer any more.`
      : 'Nothing was kept awake on this computer.'
  );
  if (released === undefined) {
    deps.out('Agent Inbox couldn’t be told just now: the lease lapses within 3 minutes.');
  }

  const awake = (await getLease(client, config.relayAgentIdentifier).catch(() => null))?.awake;
  if (awake && awake.computerId !== config.computerId) {
    deps.out(`It’s awake on ${awake.computerName}: run \`${CLI_COMMAND} wake stop\` there to stop it.`);
  }

  return EXIT_OK;
}
