import { Logger } from '@nestjs/common';
import { EnvironmentVariableForTemplate } from '@novu/dal';
import { NOVU_ENCRYPTION_SUB_MASK, SECRET_MASK } from '@novu/shared';

import { decryptSecret } from './encrypt-provider';

const LOG_CONTEXT = 'DecryptEnvironmentVariable';

export type ResolveEnvironmentVariablesOptions = {
  /**
   * When false (default), `isSecret` variables resolve to `SECRET_MASK` so they
   * cannot appear in preview/API responses or channel message content.
   * Set true only for server-side outbound execution (HTTP request / custom bridge)
   * that must send real credentials and does not return them to API callers.
   */
  includeSecrets?: boolean;
};

export function decryptEnvironmentVariableValue(value: string): string {
  if (value.startsWith(NOVU_ENCRYPTION_SUB_MASK)) {
    try {
      return decryptSecret(value);
    } catch (e) {
      Logger.warn(`Failed to decrypt environment variable value: ${(e as Error).message}`, LOG_CONTEXT);

      return '';
    }
  }

  return value;
}

export function resolveEnvironmentVariables(
  variables: EnvironmentVariableForTemplate[],
  options: ResolveEnvironmentVariablesOptions = {}
): Record<string, string> {
  const includeSecrets = options.includeSecrets === true;
  const resolved: Record<string, string> = {};

  for (const variable of variables) {
    if (variable.isSecret && !includeSecrets) {
      resolved[variable.key] = SECRET_MASK;
    } else {
      resolved[variable.key] = decryptEnvironmentVariableValue(variable.value);
    }
  }

  return resolved;
}
