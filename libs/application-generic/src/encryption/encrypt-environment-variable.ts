import { Logger } from '@nestjs/common';
import { EnvironmentVariableForTemplate } from '@novu/dal';
import { NOVU_ENCRYPTION_SUB_MASK } from '@novu/shared';

import { decryptSecret } from './encrypt-provider';

const LOG_CONTEXT = 'DecryptEnvironmentVariable';

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

export function resolveEnvironmentVariables(variables: EnvironmentVariableForTemplate[]): Record<string, string> {
  const resolved: Record<string, string> = {};

  for (const variable of variables) {
    resolved[variable.key] = decryptEnvironmentVariableValue(variable.value);
  }

  return resolved;
}
