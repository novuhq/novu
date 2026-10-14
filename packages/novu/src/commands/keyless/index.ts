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

export const KeylessExitCode = {
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

  writeKeylessBreadcrumb(cwd, {
    environmentId: environment.environmentId,
    applicationIdentifier: environment.applicationIdentifier,
    apiUrl: environment.apiUrl,
    claimUrl: environment.claimUrl,
    expiresAt: environment.expiresAt,
    createdAt: new Date().toISOString(),
  });

  if (options.envFile) {
    upsertEnvFile(path.resolve(cwd, options.envFile), toEnvVars(environment));
  }

  if (options.json) {
    console.log(JSON.stringify(environment));
  } else {
    printCreated(environment, options.envFile);
  }

  return KeylessExitCode.OK;
}

export async function keylessStatus(options: KeylessStatusOptions): Promise<number> {
  const cwd = options.cwd ?? process.cwd();

  if (!options.secretKey) {
    return reportError(
      new KeylessApiError('No secret key found. Pass --secret-key or set NOVU_SECRET_KEY.', 0),
      options.json
    );
  }

  let environment: KeylessEnvironmentStatus;
  try {
    environment = await getKeylessEnvironment({
      apiUrl: resolveApiUrl(options.apiUrl, cwd),
      secretKey: options.secretKey,
    });
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

  if (options.secretKey) {
    try {
      const environment = await getKeylessEnvironment({
        apiUrl: resolveApiUrl(options.apiUrl, cwd),
        secretKey: options.secretKey,
      });
      claimUrl = environment.claimUrl;
    } catch (error) {
      if (!(error instanceof KeylessApiError) || exitCodeFor(error) !== KeylessExitCode.ERROR || !breadcrumb) {
        return reportError(error);
      }
    }
  }

  if (!claimUrl && breadcrumb) {
    if (Date.parse(breadcrumb.expiresAt) <= Date.now()) {
      return reportError(
        new KeylessApiError(
          `This keyless environment expired on ${breadcrumb.expiresAt}. Run \`novu keyless create\` to start a new one.`,
          0,
          'keyless_environment_expired'
        )
      );
    }

    claimUrl = breadcrumb.claimUrl;
  }

  if (!claimUrl) {
    return reportError(new KeylessApiError('No keyless environment found here. Run `novu keyless create` first.', 0));
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

function resolveApiUrl(apiUrl: string | undefined, cwd: string): string {
  return apiUrl ?? readKeylessBreadcrumb(cwd)?.apiUrl ?? DEFAULT_KEYLESS_API_URL;
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

  if (json) {
    console.log(JSON.stringify({ error: { status: error.status, code: error.code, message: error.message } }));
  } else {
    console.error(red(error.message));
  }

  return exitCodeFor(error);
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
