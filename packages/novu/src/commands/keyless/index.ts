import path from 'node:path';
import open from 'open';
import { bold, cyan, red } from 'picocolors';
import {
  type CreatedKeylessEnvironment,
  createKeylessEnvironment,
  getKeylessEnvironment,
  KeylessApiError,
  type KeylessEnvironmentStatus,
} from './api';
import { readKeylessBreadcrumb, writeKeylessBreadcrumb } from './breadcrumb';
import { upsertEnvFile } from './env-file';

export const DEFAULT_KEYLESS_API_URL = 'https://api.novu.co';

const NOVU_CLOUD_DOMAIN = 'novu.co';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const UNTRUSTED_BREADCRUMB_API_URL_MESSAGE =
  '.novu/keyless.json points at an API URL outside Novu Cloud. Pass --api-url (or set NOVU_API_URL) to use it.';

const KeylessExitCode = {
  OK: 0,
  ERROR: 1,
  CLAIMED: 3,
  EXPIRED: 4,
} as const;

export type KeylessCreateOptions = {
  apiUrl?: string;
  source?: string;
  envFile?: string;
  json?: boolean;
  cwd?: string;
};

export type KeylessStatusOptions = {
  apiUrl?: string;
  secretKey?: string;
  json?: boolean;
  cwd?: string;
};

export type KeylessClaimOptions = {
  apiUrl?: string;
  secretKey?: string;
  open?: boolean;
  cwd?: string;
};

export async function keylessCreate(options: KeylessCreateOptions): Promise<number> {
  const cwd = options.cwd ?? process.cwd();

  let environment: CreatedKeylessEnvironment;
  try {
    environment = await createKeylessEnvironment({
      apiUrl: options.apiUrl ?? DEFAULT_KEYLESS_API_URL,
      source: options.source,
    });
  } catch (error) {
    return reportError(error, options.json);
  }

  const saveFailures = saveLocally(cwd, environment, options.envFile);
  const savedEnvFile = saveFailures.some((failure) => failure.target === 'env-file') ? undefined : options.envFile;

  if (options.json) {
    console.log(JSON.stringify(environment));
  } else {
    printCreated(environment, savedEnvFile);
  }

  for (const failure of saveFailures) {
    console.error(red(failure.message));
  }

  return KeylessExitCode.OK;
}

type LocalSaveFailure = { target: 'breadcrumb' | 'env-file'; message: string };

/** Best-effort: the secret key is only returned once, so a local write failure must never hide it. */
function saveLocally(cwd: string, environment: CreatedKeylessEnvironment, envFile?: string): LocalSaveFailure[] {
  const failures: LocalSaveFailure[] = [];

  try {
    writeKeylessBreadcrumb(cwd, {
      environmentId: environment.environmentId,
      applicationIdentifier: environment.applicationIdentifier,
      apiUrl: environment.apiUrl,
      claimUrl: environment.claimUrl,
      expiresAt: environment.expiresAt,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    failures.push({
      target: 'breadcrumb',
      message: `Could not save .novu/keyless.json (${errorMessage(error)}). Keep the claim URL above.`,
    });
  }

  if (envFile) {
    try {
      upsertEnvFile(path.resolve(cwd, envFile), toEnvVars(environment));
    } catch (error) {
      failures.push({
        target: 'env-file',
        message: `Could not write ${envFile} (${errorMessage(error)}). Copy the values above instead.`,
      });
    }
  }

  return failures;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function keylessStatus(options: KeylessStatusOptions): Promise<number> {
  const cwd = options.cwd ?? process.cwd();

  if (!options.secretKey) {
    return fail('No secret key found. Pass --secret-key or set NOVU_SECRET_KEY.', KeylessExitCode.ERROR, options.json);
  }

  const apiUrl = resolveApiUrl(options.apiUrl, cwd);
  if (!apiUrl) {
    return fail(UNTRUSTED_BREADCRUMB_API_URL_MESSAGE, KeylessExitCode.ERROR, options.json);
  }

  let environment: KeylessEnvironmentStatus;
  try {
    environment = await getKeylessEnvironment({ apiUrl, secretKey: options.secretKey });
  } catch (error) {
    return reportError(error, options.json);
  }

  if (options.json) {
    console.log(JSON.stringify(environment));
  } else {
    console.log(`Keyless environment ${environment.environmentId} is ${bold(environment.status)}.`);
    console.log(`Expires: ${environment.expiresAt}`);
    console.log(`Claim URL: ${cyan(environment.claimUrl)}`);
  }

  return KeylessExitCode.OK;
}

export async function keylessClaim(options: KeylessClaimOptions): Promise<number> {
  const cwd = options.cwd ?? process.cwd();
  const breadcrumb = readKeylessBreadcrumb(cwd);

  let claimUrl: string | undefined;
  const apiUrl = resolveApiUrl(options.apiUrl, cwd);

  if (options.secretKey && apiUrl) {
    try {
      const environment = await getKeylessEnvironment({ apiUrl, secretKey: options.secretKey });
      claimUrl = environment.claimUrl;
    } catch (error) {
      const canFallBackToBreadcrumb =
        error instanceof KeylessApiError && exitCodeFor(error) === KeylessExitCode.ERROR && breadcrumb;

      if (!canFallBackToBreadcrumb) {
        return reportError(error);
      }
    }
  }

  if (!claimUrl && breadcrumb) {
    if (Date.parse(breadcrumb.expiresAt) <= Date.now()) {
      return fail(
        `This keyless environment expired on ${breadcrumb.expiresAt}. Run \`novu keyless create\` to start a new one.`,
        KeylessExitCode.EXPIRED
      );
    }

    claimUrl = breadcrumb.claimUrl;
  }

  if (!claimUrl) {
    return fail('No keyless environment found here. Run `novu keyless create` first.', KeylessExitCode.ERROR);
  }

  console.log(`Open this link to keep this setup in your Novu account: ${cyan(claimUrl)}`);

  if (options.open !== false && process.stdout.isTTY) {
    try {
      await open(claimUrl);
    } catch {
      // The URL is already printed; a missing browser is not an error.
    }
  }

  return KeylessExitCode.OK;
}

/**
 * The breadcrumb lives in the project, so it can be planted by whoever controls the repository.
 * Its API URL is only trusted for Novu Cloud and loopback hosts; anything else must be passed explicitly.
 * Returns null when the breadcrumb names an untrusted host.
 */
function resolveApiUrl(apiUrl: string | undefined, cwd: string): string | null {
  if (apiUrl) {
    return apiUrl;
  }

  const breadcrumbApiUrl = readKeylessBreadcrumb(cwd)?.apiUrl;
  if (!breadcrumbApiUrl) {
    return DEFAULT_KEYLESS_API_URL;
  }

  return isTrustedBreadcrumbApiUrl(breadcrumbApiUrl) ? breadcrumbApiUrl : null;
}

function isTrustedBreadcrumbApiUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (LOOPBACK_HOSTS.has(url.hostname)) {
    return url.protocol === 'http:' || url.protocol === 'https:';
  }

  return (
    url.protocol === 'https:' && (url.hostname === NOVU_CLOUD_DOMAIN || url.hostname.endsWith(`.${NOVU_CLOUD_DOMAIN}`))
  );
}

function exitCodeFor(error: KeylessApiError): number {
  switch (error.code) {
    case 'keyless_environment_claimed':
      return KeylessExitCode.CLAIMED;
    case 'keyless_environment_expired':
      return KeylessExitCode.EXPIRED;
    default:
      return KeylessExitCode.ERROR;
  }
}

function reportError(error: unknown, json?: boolean): number {
  if (!(error instanceof KeylessApiError)) {
    throw error;
  }

  return fail(error.message, exitCodeFor(error), json, { status: error.status, code: error.code });
}

function fail(message: string, exitCode: number, json?: boolean, details?: { status: number; code?: string }): number {
  if (json) {
    console.log(JSON.stringify({ error: { ...details, message } }));
  } else {
    console.error(red(message));
  }

  return exitCode;
}

function toEnvVars(environment: CreatedKeylessEnvironment): Record<string, string> {
  return {
    NOVU_SECRET_KEY: environment.secretKey,
    NOVU_APPLICATION_IDENTIFIER: environment.applicationIdentifier,
    NOVU_API_URL: environment.apiUrl,
  };
}

function printCreated(environment: CreatedKeylessEnvironment, envFile?: string): void {
  console.log(bold(`Created a keyless Novu environment (expires ${environment.expiresAt}).`));
  console.log('');
  for (const [key, value] of Object.entries(toEnvVars(environment))) {
    console.log(`${key}=${value}`);
  }
  if (envFile) {
    console.log(`Saved to ${envFile}`);
  }
  console.log('');
  console.log(`Claim URL: ${cyan(environment.claimUrl)}`);
  console.log(
    `Tell the human: "Open ${environment.claimUrl} to keep this Novu setup in your own account (before ${environment.expiresAt})."`
  );
}
