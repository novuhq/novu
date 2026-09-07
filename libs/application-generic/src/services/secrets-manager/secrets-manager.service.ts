import { AwsSecretsManagerService } from './aws-secrets-manager.service';
import { ProcessEnvSecretsService } from './process-env.service';
import type { ISecretsManagerService } from './types';

const LOG_CONTEXT = 'SecretsManagerService';

export function parseBooleanString(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase().trim();

  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

export class SecretsManagerService {
  public service: ISecretsManagerService;

  constructor() {
    this.service = SecretsManagerService.resolveProvider();
  }

  /**
   * Picks the secret provider from the environment. Remote fetch is an
   * enterprise feature (cloud and self-hosted alike) that is opted into by
   * setting `SECRET_NAME`:
   *   - `SECRET_NAME` set  -> the operator wants a remote secret store, so we
   *     use it and require `NOVU_REGION`. A missing region is a misconfiguration
   *     and throws rather than silently falling back to `process.env`.
   *   - `SECRET_NAME` unset -> boot from `process.env` (committed `.env`
   *     defaults / task-definition vars). This is how enterprise cloud opts out
   *     of the remote store.
   */
  private static resolveProvider(): ISecretsManagerService {
    const isEnterprise = parseBooleanString(process.env.NOVU_ENTERPRISE);
    const secretName = process.env.SECRET_NAME;
    const region = process.env.NOVU_REGION;

    if (!isEnterprise || !secretName) {
      return new ProcessEnvSecretsService();
    }

    if (!region) {
      throw new Error(
        'SECRET_NAME is set but NOVU_REGION is missing. Set NOVU_REGION to load secrets from AWS Secrets Manager, or unset SECRET_NAME to boot from process.env.'
      );
    }

    return new AwsSecretsManagerService(secretName, region);
  }

  /** Human-readable deployment mode for boot logs. */
  private static resolveDeploymentMode(): string {
    const isEnterprise = parseBooleanString(process.env.NOVU_ENTERPRISE);

    if (!isEnterprise) {
      return 'community';
    }

    const isSelfHosted = parseBooleanString(process.env.IS_SELF_HOSTED);

    return isSelfHosted ? 'enterprise self-hosted' : 'enterprise cloud';
  }

  /**
   * Loads secrets from the configured provider and merges them into
   * `process.env` in-memory. Existing values are preserved, so container-provided
   * vars always win over the fetched secret.
   *
   * Runs before NestJS boots (and therefore before the Pino logger exists), so it
   * logs via `console` to keep `@nestjs/common` out of the pre-instrument import graph.
   */
  public async hydrateProcessEnv(): Promise<void> {
    const providerName = this.service.constructor.name;
    const deploymentMode = SecretsManagerService.resolveDeploymentMode();

    console.log(`[${LOG_CONTEXT}] Booting up ${deploymentMode} version (secrets provider: ${providerName}).`);

    try {
      const secrets = await this.service.loadSecrets();
      const keys = Object.keys(secrets);

      for (const key of keys) {
        if (process.env[key] === undefined) {
          process.env[key] = secrets[key];
        }
      }

      if (keys.length > 0) {
        console.log(`[${LOG_CONTEXT}] Hydrated process.env with ${keys.length} secret(s) via ${providerName}.`);
      }
    } catch (error) {
      console.error(`[${LOG_CONTEXT}] Failed to hydrate secrets via ${providerName}.`, error);
      throw error;
    }
  }
}

/** Convenience entrypoint for pre-boot hydration. */
export async function hydrateProcessEnvFromSecrets(): Promise<void> {
  await new SecretsManagerService().hydrateProcessEnv();
}

/**
 * Shared entrypoint wrapper for every app: hydrate secrets, then start the app,
 * failing closed with `process.exit(1)` on error.
 *
 * `start` is a thunk so its dynamic `import('./bootstrap')` resolves relative to
 * the calling `main.ts` and no app module is evaluated before `process.env` is hydrated.
 */
export async function runWithHydratedSecrets(start: () => Promise<unknown>): Promise<void> {
  try {
    await hydrateProcessEnvFromSecrets();
    await start();
  } catch (error) {
    console.error('Failed to bootstrap application', error);
    process.exit(1);
  }
}
