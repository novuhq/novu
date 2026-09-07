import type { ISecretsManagerService } from './types';

/**
 * No-op provider used when no remote secret store is configured. Secrets are
 * expected to already be present in `process.env` (e.g. from the task
 * definition or committed `.env` defaults), so there is nothing to load.
 */
export class ProcessEnvSecretsService implements ISecretsManagerService {
  async loadSecrets(): Promise<Record<string, string>> {
    return {};
  }
}
