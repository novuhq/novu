import pc from 'picocolors';
import { createHumanApiClient } from '../api/client';
import {
  checkLoginRequest,
  getKeylessClaimToken,
  hasSubscriber,
  type LoginRequest,
  type LoginRequestStatus,
  startLoginRequest,
} from '../api/login';
import { info } from '../cli-io';
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

interface LoginOptions {
  apiUrl?: string;
}

export interface LoginResult {
  config: HumanCliConfig;
  /** The Human account's email, when the website passed it on. */
  email?: string;
  /** The operator on this computer still reaches the same contact and channels after logging in. */
  keptSetup: boolean;
}

export const LOGIN_UNAVAILABLE_MESSAGE =
  'This Novu API has no browser login. Run `human setup --secret-key <key>` or set NOVU_SECRET_KEY instead.';

/** The API keeps a waiting request alive for up to an hour (`CLI_DEVICE_SESSION_CONNECT_MAX_POLL_SECONDS`). */
const MAX_WAIT_MS = 60 * 60 * 1000;

export async function loginCommand(options: LoginOptions): Promise<never> {
  try {
    const result = await runLogin(options);
    const who = result.email ? ` as ${pc.bold(result.email)}` : '';

    process.stdout.write(`\n${pc.green('✔')} Logged in${who}.\n`);
    info(`Saved to ${configPath()}.`);
    process.stdout.write(
      result.keptSetup
        ? 'Your agents on this computer keep reaching you as before.\n'
        : `Next, connect a channel so agents can reach you: ${pc.bold('human setup')}\n`
    );

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

  const request = await startLoginRequest(apiUrl);
  if (!request.verificationUrl || !request.userCode) {
    throw new Error(LOGIN_UNAVAILABLE_MESSAGE);
  }

  const keylessIdentifier = current?.auth.mode === 'keyless' ? current.auth.keylessIdentifier : undefined;
  const claimToken = keylessIdentifier
    ? await getKeylessClaimToken(createHumanApiClient({ apiUrl, keylessIdentifier }))
    : null;
  const loginUrl = withClaimToken(request.verificationUrl, claimToken);

  process.stdout.write(
    `\nLog in with your Human account in your browser (opening it now):\n\n  ${pc.underline(loginUrl)}\n\n` +
      `Enter this code there:  ${pc.bold(request.userCode)}\n` +
      (claimToken ? 'The setup you made without an account moves into your Human account.\n' : '') +
      '\n'
  );
  openInBrowser(loginUrl);

  const approved = await waitForApproval(apiUrl, request, request.userCode);
  const client = createHumanApiClient({ apiUrl, secretKey: approved.apiKey });
  const subscriberId = current?.subscriberId;
  // The key is handed over only once, so a failed check must not lose it: keep the identity when unsure.
  const keptSetup = subscriberId ? await hasSubscriber(client, subscriberId).catch(() => true) : false;

  const config: HumanCliConfig = {
    apiUrl,
    auth: { mode: 'apiKey', secretKey: approved.apiKey },
    relayAgentIdentifier: current?.relayAgentIdentifier ?? DEFAULT_RELAY_AGENT_IDENTIFIER,
    ...(keptSetup ? { subscriberId, defaultChannel: current?.defaultChannel } : {}),
  };
  saveConfig(config);

  return { config, email: approved.user?.email ?? undefined, keptSetup };
}

export function withClaimToken(verificationUrl: string, claimToken: string | null): string {
  if (!claimToken) {
    return verificationUrl;
  }

  const url = new URL(verificationUrl);
  url.searchParams.set('claim', claimToken);

  return url.toString();
}

async function waitForApproval(
  apiUrl: string,
  request: LoginRequest,
  userCode: string
): Promise<Extract<LoginRequestStatus, { status: 'approved' }>> {
  const stopIndicator = startWaitIndicator(`Waiting for you to enter ${userCode} in your browser`, 'Ctrl-C cancels');
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
