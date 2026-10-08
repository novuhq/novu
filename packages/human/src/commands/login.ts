import { randomBytes } from 'node:crypto';
import { hostname } from 'node:os';
import pc from 'picocolors';
import { createHumanApiClient, type HumanApiClient } from '../api/client';
import { setupHumanRelay } from '../api/human';
import {
  checkLoginRequest,
  findOperator,
  getKeylessClaimToken,
  hasSubscriber,
  type LoginRequest,
  type LoginRequestStatus,
  startLoginRequest,
} from '../api/login';
import { info, promptLine } from '../cli-io';
import {
  configPath,
  DEFAULT_RELAY_AGENT_IDENTIFIER,
  type HumanCliConfig,
  loadConfig,
  resolveTargetApiUrl,
  saveConfig,
} from '../config';
import { openInBrowser } from '../open-browser';
import { sleep } from '../poll';
import { startWaitIndicator } from '../spinner';
import { handleError } from './interact';
import { splitName } from './invite';

interface LoginOptions {
  apiUrl?: string;
}

export interface LoginResult {
  config: HumanCliConfig;
  /** The Human account's email, when the website passed it on. */
  email?: string;
  /** The name on the Human account, when the website passed it on. */
  name?: { firstName: string; lastName?: string };
  /** The operator on this computer still reaches the same contact and channels after logging in. */
  keptSetup: boolean;
}

export const LOGIN_UNAVAILABLE_MESSAGE =
  'This Novu API has no browser login. Run `human setup --secret-key <key>` or set NOVU_SECRET_KEY instead.';

export const LOGIN_DENIED_MESSAGE =
  'This login was denied in the browser, so nothing changed. Run `human login` again if that was a mistake.';

/** Matches the API's `CLI_MACHINE_NAME_MAX_LENGTH`; longer names are cut there anyway. */
const MACHINE_NAME_MAX_LENGTH = 64;

/** The API keeps a waiting request alive for up to an hour (`CLI_DEVICE_SESSION_CONNECT_MAX_POLL_SECONDS`). */
const MAX_WAIT_MS = 60 * 60 * 1000;

export async function loginCommand(options: LoginOptions): Promise<never> {
  try {
    const result = await runLogin(options);
    const who = result.email ? ` as ${pc.bold(result.email)}` : '';

    process.stdout.write(`\n${pc.green('✔')} Logged in${who}.\n`);
    info(`Saved to ${configPath()}.`);

    // Asked only now that the key is saved, so stopping at the question loses nothing.
    if (!result.config.subscriberId) {
      await introduceYourself(result);
    }

    process.stdout.write(`${describeNextStep(result)}\n`);

    if (process.env.NOVU_SECRET_KEY?.trim()) {
      info('NOVU_SECRET_KEY is set in this shell, and it takes priority over this login.');
    }

    process.exit(0);
  } catch (err) {
    handleError(err);
  }
}

/**
 * Logs the CLI in to a Human account in the browser. A keyless setup made on this computer moves into the
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
    ? await getKeylessClaimToken(createHumanApiClient({ apiUrl, keylessIdentifier }))
    : null;
  const loginUrl = withClaimToken(request.verificationUrl, claimToken);

  // Newer APIs put the code in the link, so the page shows it; with older ones it's typed there.
  const pageShowsCode = new URL(loginUrl).searchParams.get('code') === request.userCode;

  process.stdout.write(
    `\nLog in with your Human account in your browser (opening it now):\n\n  ${pc.underline(loginUrl)}\n\n` +
      (pageShowsCode
        ? `Approve there only if the page shows this code:  ${pc.bold(request.userCode)}\n`
        : `Enter this code there:  ${pc.bold(request.userCode)}\n`) +
      (claimToken ? 'The setup you made without an account moves into your Human account.\n' : '') +
      '\n'
  );
  openInBrowser(loginUrl);

  const approved = await waitForApproval(apiUrl, request, request.userCode, pageShowsCode);
  const client = createHumanApiClient({ apiUrl, secretKey: approved.apiKey });
  const savedId = current?.subscriberId;
  // Who agents on this computer reach by default is the contact the account has for its owner, so "you" is
  // one person here, on the dashboard and on any other computer. The key is handed over only once, so a
  // failed lookup must not fail the login.
  const operatorId = await findOperator(client).catch(() => undefined);
  const keptSetup = await isStillYou(client, savedId, operatorId);

  const config: HumanCliConfig = {
    apiUrl,
    auth: { mode: 'apiKey', secretKey: approved.apiKey },
    relayAgentIdentifier: current?.relayAgentIdentifier ?? DEFAULT_RELAY_AGENT_IDENTIFIER,
    // The default channel saved here is that contact's own preference, so it only stays with them.
    ...(keptSetup ? { subscriberId: savedId, defaultChannel: current?.defaultChannel } : {}),
    ...(operatorId && !keptSetup ? { subscriberId: operatorId } : {}),
  };
  saveConfig(config);

  const { email, firstName, lastName } = approved.user ?? {};

  return {
    config,
    email: email ?? undefined,
    ...(firstName ? { name: { firstName, ...(lastName ? { lastName } : {}) } } : {}),
    keptSetup,
  };
}

/**
 * Whether the contact saved on this computer is still who agents here reach. The account's word wins.
 * When it has no owner on record, or can't be asked, the saved contact stays unless the account certainly
 * doesn't have it: a failed check must not cost someone their identity.
 */
async function isStillYou(
  client: HumanApiClient,
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

/**
 * The account has no contact for its owner yet, so agents on this computer would have nobody to reach.
 * Asks who that is, makes the contact the way `human setup` and the dashboard do, and saves it as who this
 * computer reaches. Where there is no terminal to ask in, the name on the Human account is used. The login
 * is saved by now, so failing here only leaves this step to `human setup`.
 */
export async function introduceYourself(
  { config, name }: Pick<LoginResult, 'config' | 'name'>,
  io: { isTTY: boolean; prompt: (question: string) => Promise<string> } = {
    isTTY: Boolean(process.stdin.isTTY),
    prompt: promptLine,
  }
): Promise<HumanCliConfig> {
  const accountName = [name?.firstName, name?.lastName].filter(Boolean).join(' ');
  const answer = io.isTTY
    ? await io.prompt(
        `Who are you? Your name, as agents will see it${accountName ? ` [${accountName}]` : ' (optional)'}: `
      )
    : '';
  // Only a suggestion: an owner the account already knows wins, and is what comes back.
  const suggestedId = `human_${randomBytes(6).toString('hex')}`;

  try {
    const client = createHumanApiClient({ apiUrl: config.apiUrl, secretKey: config.auth.secretKey });
    const relay = await setupHumanRelay(client, {
      subscriberId: suggestedId,
      operator: true,
      agentIdentifier: config.relayAgentIdentifier,
      ...splitName(answer.trim() || accountName),
    });
    const introduced: HumanCliConfig = { ...config, subscriberId: relay.subscriberId || suggestedId };
    saveConfig(introduced);

    return introduced;
  } catch (err) {
    info(`Couldn't save who you are just now (${err instanceof Error ? err.message : String(err)}).`);

    return config;
  }
}

/** What to do after logging in, which depends on whether agents on this computer know who to reach. */
export function describeNextStep({ config, keptSetup }: Pick<LoginResult, 'config' | 'keptSetup'>): string {
  if (keptSetup) {
    return 'Your agents on this computer keep reaching you as before.';
  }

  if (config.subscriberId) {
    return `Agents on this computer now reach you on your account's channels. None connected yet? Run: ${pc.bold('human setup')}`;
  }

  return `Next, connect a channel so agents can reach you: ${pc.bold('human setup')}`;
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
        throw new Error('This login request expired. Run `human login` again.');
      }

      if (status.status === 'denied') {
        throw new Error(LOGIN_DENIED_MESSAGE);
      }

      intervalMs = toIntervalMs(status.interval);
    }

    throw new Error('Timed out waiting for the login. Run `human login` again.');
  } finally {
    stopIndicator();
  }
}

function toIntervalMs(seconds: number): number {
  return Number.isFinite(seconds) && seconds >= 1 ? seconds * 1000 : 2000;
}
