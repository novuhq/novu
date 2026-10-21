import pc from 'picocolors';
import { ApiError, createApiClient } from '../api/client';
import { type ConnectedAgent, connectWithCode } from '../api/connect';
import { findOperator } from '../api/login';
import { info, promptLine, success } from '../cli-io';
import { CLI_COMMAND, type CliConfig, configPath, loadConfig, resolveTargetApiUrl, saveConfig } from '../config';
import { openedScreen, openScreen } from '../screen/screen';
import { failOnScreen } from './failure';
import { handleError } from './interact';

interface ConnectOptions {
  code?: string;
  yes?: boolean;
  apiUrl?: string;
}

/** Where `connect` asks before it replaces a setup. Without a terminal it can't ask, and `--yes` answers. */
export interface ConnectIo {
  isTTY: boolean;
  prompt: (question: string) => Promise<string>;
}

export interface ConnectResult {
  config: CliConfig;
  agent: ConnectedAgent['agent'];
  /** Agents on this computer still reach the same contact as before: it was the same account already. */
  keptSetup: boolean;
}

export const CONNECT_UNAVAILABLE_MESSAGE = `This API can't connect with a one-time code. Run \`${CLI_COMMAND} login\` instead.`;

export const CONNECT_CANCELED_MESSAGE = 'Nothing changed. The code still works for the rest of its 10 minutes.';

/** Matches the API's `AGENT_HANDLE_PATTERN` and `AGENT_HANDLE_MAX_LENGTH`. */
const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HANDLE_MAX_LENGTH = 32;

export async function connectCommand(agent: string, options: ConnectOptions): Promise<never> {
  const screen = await openScreen({ command: 'connect', handle: handleOf(agent) });

  try {
    const result = await runConnect(agent, options);
    const { handle, name } = result.agent;
    const named = name && name.toLowerCase() !== handle ? ` (${name})` : '';

    if (screen) {
      screen.add({ mark: 'done', value: `Connected to ${pc.bold(handle)}${named}.` });
      screen.feel('happy');
    } else {
      process.stdout.write(`\n${pc.green('✔')} Connected to ${pc.bold(handle)}${named}.\n`);
    }
    success(`Saved to ${configPath()}.`);

    if (!result.config.subscriberId) {
      info(`Messages need --to until the account has you as a contact: run ${pc.bold(`${CLI_COMMAND} setup`)}.`);
    }

    const check = `Check it works: ${pc.bold(`${CLI_COMMAND} inbox list`)}`;
    if (screen) {
      screen.add({ mark: 'next', value: check });
    } else {
      process.stdout.write(`${check}\n`);
    }

    if (process.env.INBOX_SECRET_KEY?.trim()) {
      info('INBOX_SECRET_KEY is set in this shell, and it takes priority over this connection.');
    }

    await screen?.done('happy');
    process.exit(0);
  } catch (err) {
    if (screen) {
      await failOnScreen(screen, err);
    }
    handleError(err);
  }
}

/**
 * Connects this computer to an agent with the one-time code the operator got on agentinbox.md. The code
 * is traded for the key `login` saves, so from then on every command here acts as that agent. A setup
 * already on this computer is only replaced once that's confirmed (`--yes`, or yes on a terminal), and
 * that's asked before the code is used, so saying no leaves the code working.
 */
export async function runConnect(
  agentInput: string,
  options: ConnectOptions,
  io: ConnectIo = { isTTY: Boolean(process.stdin.isTTY), prompt: promptLine }
): Promise<ConnectResult> {
  const agent = readAgent(agentInput);
  const code = readCode(options.code);
  const existing = loadConfig();
  const apiUrl = resolveTargetApiUrl(options.apiUrl, existing);

  if (existing && !options.yes) {
    await confirmReplacing(existing, agent, io);
  }

  // Only a screen shows the code being checked; without one, the result is all that is printed.
  const stopWaiting = openedScreen()?.wait({ status: { text: `Connecting to ${agent}…` } });
  const connected = await connectWithCode(apiUrl, { agent, code })
    .catch((err: unknown) => {
      throw isMissingRoute(err) ? new Error(CONNECT_UNAVAILABLE_MESSAGE) : err;
    })
    .finally(stopWaiting);

  // Who agents here reach by default only carries over from the same account, which has the same key.
  const current = existing?.apiUrl === apiUrl ? existing : null;
  const sameAccount = current?.auth.mode === 'apiKey' && current.auth.secretKey === connected.apiKey;
  const savedId = sameAccount ? current?.subscriberId : undefined;
  // The key is handed over only once, so a failed lookup must not fail the connection.
  const operatorId = await findOperator(createApiClient({ apiUrl, secretKey: connected.apiKey })).catch(
    () => undefined
  );
  const keptSetup = Boolean(savedId) && (!operatorId || operatorId === savedId);

  const config: CliConfig = {
    apiUrl,
    auth: { mode: 'apiKey', secretKey: connected.apiKey },
    relayAgentIdentifier: connected.agent.identifier,
    ...(keptSetup ? { subscriberId: savedId, defaultChannel: current?.defaultChannel } : {}),
    ...(operatorId && !keptSetup ? { subscriberId: operatorId } : {}),
  };
  saveConfig(config);

  return { config, agent: connected.agent, keptSetup };
}

/** `atlas`, `Atlas` and `atlas@agentinbox.md` all name the agent `atlas`. */
export function readAgent(input: string): string {
  const handle = String(input ?? '')
    .trim()
    .toLowerCase()
    .split('@')[0];

  if (!HANDLE_PATTERN.test(handle) || handle.length > HANDLE_MAX_LENGTH) {
    throw new Error(
      `Name the agent as its address starts, before the @: ${CLI_COMMAND} connect atlas --code BCDF-GHJK`
    );
  }

  return handle;
}

/** The agent's handle for the screen's caption, where `input` names one. */
function handleOf(input: string): string | undefined {
  try {
    return readAgent(input);
  } catch {
    return undefined;
  }
}

/** The code as agentinbox.md shows it, e.g. `BCDF-GHJK`. Case, spaces and the dash don't matter. */
export function readCode(input: string | undefined): string {
  const letters = String(input ?? '')
    .toUpperCase()
    .replace(/[\s-]/g, '');

  if (!/^[A-Z]{8}$/.test(letters)) {
    throw new Error('Pass the one-time code from agentinbox.md: eight letters, like --code BCDF-GHJK.');
  }

  return `${letters.slice(0, 4)}-${letters.slice(4)}`;
}

async function confirmReplacing(existing: CliConfig, agent: string, io: ConnectIo): Promise<void> {
  const what =
    existing.auth.mode === 'keyless'
      ? `This computer has an inbox set up without an account. Connecting ${agent} replaces it here; to keep that one instead, run \`${CLI_COMMAND} login\`.`
      : `This computer is already set up for an Agent Inbox account. Connecting ${agent} makes it act as ${agent} from now on.`;

  if (!io.isTTY) {
    throw new Error(`${what} Run the same command with --yes to connect anyway: the code still works.`);
  }

  const answer = await io.prompt(`${what}\nContinue? [y/N] `);
  if (!/^y(es)?$/i.test(answer.trim())) {
    throw new Error(CONNECT_CANCELED_MESSAGE);
  }
}

/** An API from before one-time codes answers 404 without a code of its own. */
function isMissingRoute(err: unknown): boolean {
  if (!(err instanceof ApiError) || err.status !== 404) {
    return false;
  }

  const body = err.body;

  return !(body && typeof body === 'object' && typeof (body as { code?: unknown }).code === 'string');
}
