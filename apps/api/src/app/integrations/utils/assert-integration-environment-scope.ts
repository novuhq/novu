import { ForbiddenException } from '@nestjs/common';

type IntegrationMutationAction = 'update' | 'delete' | 'set as primary' | 'auto-configure';

export function assertIntegrationEnvironmentScope(params: {
  restrictToUserEnvironment?: boolean;
  userEnvironmentId: string;
  integrationEnvironmentId: string;
  action: IntegrationMutationAction;
}): void {
  if (!params.restrictToUserEnvironment) {
    return;
  }

  if (params.integrationEnvironmentId === params.userEnvironmentId) {
    return;
  }

  throw new ForbiddenException(
    `API key authentication is scoped to a single environment and cannot ${params.action} an integration ` +
      "that belongs to a different environment. Use an API key from the integration's environment, " +
      'or authenticate with a session token.'
  );
}
