import { hostname } from 'node:os';
import pc from 'picocolors';
import { type ApiClient, createApiClient } from '../api/client';
import {
  checkLoginRequest,
  findOperator,
  getKeylessClaimToken,
  hasSubscriber,
  type LoginRequest,
  type LoginRequestStatus,
  startLoginRequest,
} from '../api/login';
import { info, success } from '../cli-io';
import {
  type CliConfig,
  configPath,
  DEFAULT_RELAY_AGENT_IDENTIFIER,
  loadConfig,
  resolveTargetApiUrl,
  saveConfig,
} from '../config';
import { keptHost } from '../host';
import { openInBrowser } from '../open-browser';
import { sleep } from '../poll';
import { openedScreen, openScreen } from '../screen/screen';
import { startWaitIndicator } from '../spinner';
import { failOnScreen } from './failure';
import { handleError } from './interact';

interface LoginOptions {
  apiUrl?: string;
}

export interface LoginResult {
  config: CliConfig;
  /** The Agent Inbox account's email, when the website passed it on. */
  email?: string;
  /** The operator on this computer still reaches the same contact and channels after logging in. */
  keptSetup: boolean;
}

export const LOGIN_UNAVAILABLE_MESSAGE =
  'This API has no browser login. Run `npx @agentinbox/cli setup --secret-key <key>` or set INBOX_SECRET_KEY instead.';

export const LOGIN_DENIED_MESSAGE =
  'This login was denied in the browser, so nothing changed. Run `npx @agentinbox/cli login` again if that was a mistake.';

/** Matches the API's `CLI_MACHINE_NAME_MAX_LENGTH`; longer names are cut there anyway. */
const MACHINE_NAME_MAX_LENGTH = 64;

/** The API keeps a waiting request alive for up to an hour (`CLI_DEVICE_SESSION_CONNECT_MAX_POLL_SECONDS`). */
const MAX_WAIT_MS = 60 * 60 * 1000;

export async function loginCommand(options: LoginOptions): Promise<never> {
  const screen = await openScreen({ command: 'login' });

  try {
    const result = await runLogin(options);
    const who = result.email ? ` as ${pc.bold(result.email)}` : '';

    if (screen) {
      screen.add({ mark: 'done', value: `Logged in${who}.` });
      screen.feel('happy');
    } else {
      process.stdout.write(`\n${pc.green('✔')} Logged in${who}.\n`);
    }
    success(`Saved to ${configPath()}.`);

    const nextStep = describeNextStep(result);
    if (screen) {
      screen.add({ mark: 'next', value: nextStep });
    } else {
      process.stdout.write(`${nextStep}\n`);
    }

    if (process.env.INBOX_SECRET_KEY?.trim()) {
      info('INBOX_SECRET_KEY is set in this shell, and it takes priority over this login.');
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
 * Logs the CLI in to a Agent Inbox account in the browser. A keyless setup made on this computer moves into the
 * account on the same page, so the local identity (contact, relay, default channel) carries over.
 */
export async function runLogin(options: LoginOptions): Promise<LoginResult> {
  const existing = loadConfig();
  const apiUrl = resolveTargetApiUrl(options.apiUrl, existing);
  // Everything saved belongs to one API; it only carries over when logging in to that same API.
  const current = existing?.apiUrl === apiUrl ? existing : null;

  const request = await startLoginRequest(apiUrl, readMachineName());
  if (!request.verificationUrl || !request.userCode) {
    throw new Error(LOGIN_UNAVAILABLE_MESSAGE);
  }

  const keylessIdentifier = current?.auth.mode === 'keyless' ? current.auth.keylessIdentifier : undefined;
  const claimToken = keylessIdentifier
    ? await getKeylessClaimToken(createApiClient({ apiUrl, keylessIdentifier }))
    : null;
  const loginUrl = withClaimToken(request.verificationUrl, claimToken);

  // Newer APIs put the code in the link, so the page shows it; with older ones it's typed there.
  const pageShowsCode = new URL(loginUrl).searchParams.get('code') === request.userCode;

  showLoginLink(loginUrl, request.userCode, pageShowsCode, Boolean(claimToken));
  openInBrowser(loginUrl);

  const approved = await waitForApproval(apiUrl, request, request.userCode, pageShowsCode);
  const client = createApiClient({ apiUrl, secretKey: approved.apiKey });
  const savedId = current?.subscriberId;
  // Who agents on this computer reach by default is the contact the account has for its owner, so "you" is
  // one person here, on the dashboard and on any other computer. The key is handed over only once, so a
  // failed lookup must not fail the login.
  const operatorId = await findOperator(client).catch(() => undefined);
  const keptSetup = await isStillYou(client, savedId, operatorId);

  const config: CliConfig = {
    apiUrl,
    auth: { mode: 'apiKey', secretKey: approved.apiKey },
    relayAgentIdentifier: current?.relayAgentIdentifier ?? DEFAULT_RELAY_AGENT_IDENTIFIER,
    // The default channel saved here is that contact's own preference, so it only stays with them.
    ...(keptSetup ? { subscriberId: savedId, defaultChannel: current?.defaultChannel } : {}),
    ...(operatorId && !keptSetup ? { subscriberId: operatorId } : {}),
    ...keptHost(existing, apiUrl),
  };
  saveConfig(config);

  return { config, email: approved.user?.email ?? undefined, keptSetup };
}

/** Where to log in and the code to check there: on the command's screen, or printed as always. */
function showLoginLink(loginUrl: string, userCode: string, pageShowsCode: boolean, movesSetup: boolean): void {
  const checkCode = pageShowsCode
    ? `Approve there only if the page shows this code:  ${pc.bold(userCode)}`
    : `Enter this code there:  ${pc.bold(userCode)}`;
  const setupMoves = 'The setup you made without an account moves into your Agent Inbox account.';
  const screen = openedScreen();

  if (screen) {
    screen.subtitle('Log in with your Agent Inbox account in your browser (opening it now).');
    screen.rows([
      { step: '01', value: pc.underline(loginUrl), whole: true },
      { step: '02', value: checkCode },
      ...(movesSetup ? [{ mark: 'info' as const, value: setupMoves }] : []),
    ]);

    return;
  }

  process.stdout.write(
    `\nLog in with your Agent Inbox account in your browser (opening it now):\n\n  ${pc.underline(loginUrl)}\n\n` +
      `${checkCode}\n` +
      (movesSetup ? `${setupMoves}\n` : '') +
      '\n'
  );
}

/**
 * Whether the contact saved on this computer is still who agents here reach. The account's word wins.
 * When it has no owner on record, or can't be asked, the saved contact stays unless the account certainly
 * doesn't have it: a failed check must not cost someone their identity.
 */
async function isStillYou(
  client: ApiClient,
  savedId: string | undefined,
  operatorId: string | undefined
): Promise<boolean> {
  if (!savedId) {
    return false;
  }

  if (operatorId) {
    return operatorId === savedId;
  }

  return hasSubscriber(client, savedId).catch(() => true);
}

/** What to do after logging in, which depends on whether agents on this computer know who to reach. */
export function describeNextStep({ config, keptSetup }: Pick<LoginResult, 'config' | 'keptSetup'>): string {
  if (keptSetup) {
    return 'Your agents on this computer keep reaching you as before.';
  }

  if (config.subscriberId) {
    return `Agents on this computer now reach you on your account's channels. None connected yet? Run: ${pc.bold('npx @agentinbox/cli setup')}`;
  }

  return `Next, name your agent and connect a channel: ${pc.bold('npx @agentinbox/cli setup')}`;
}

export function withClaimToken(verificationUrl: string, claimToken: string | null): string {
  if (!claimToken) {
    return verificationUrl;
  }

  const url = new URL(verificationUrl);
  url.searchParams.set('claim', claimToken);

  return url.toString();
}

/** This computer's name, for the page to show. Left out when the system has none to give. */
function readMachineName(): string | undefined {
  try {
    return hostname().trim().slice(0, MACHINE_NAME_MAX_LENGTH) || undefined;
  } catch {
    return undefined;
  }
}

async function waitForApproval(
  apiUrl: string,
  request: LoginRequest,
  userCode: string,
  pageShowsCode: boolean
): Promise<Extract<LoginRequestStatus, { status: 'approved' }>> {
  const stopIndicator = startWaitIndicator(
    pageShowsCode
      ? `Waiting for you to approve ${userCode} in your browser`
      : `Waiting for you to enter ${userCode} in your browser`,
    'Ctrl-C cancels'
  );
  const deadline = Date.now() + MAX_WAIT_MS;
  let intervalMs = toIntervalMs(request.interval);

  try {
    while (Date.now() < deadline) {
      await sleep(intervalMs);
      const status = await checkLoginRequest(apiUrl, request.deviceCode);

      if (status.status === 'approved') {
        return status;
      }

      if (status.status === 'expired') {
        throw new Error('This login request expired. Run `npx @agentinbox/cli login` again.');
      }

      if (status.status === 'denied') {
        throw new Error(LOGIN_DENIED_MESSAGE);
      }

      intervalMs = toIntervalMs(status.interval);
    }

    throw new Error('Timed out waiting for the login. Run `npx @agentinbox/cli login` again.');
  } finally {
    stopIndicator();
  }
}

function toIntervalMs(seconds: number): number {
  return Number.isFinite(seconds) && seconds >= 1 ? seconds * 1000 : 2000;
}
