import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';

type EnvironmentVariableValueInput = {
  _environmentId: string;
};

type ValidateEnvironmentVariableValuesOptions = {
  restrictToUserEnvironment?: boolean;
  userEnvironmentId?: string;
};

export async function validateEnvironmentVariableValues(
  environmentRepository: EnvironmentRepository,
  organizationId: string,
  values: EnvironmentVariableValueInput[] | undefined,
  options?: ValidateEnvironmentVariableValuesOptions
): Promise<void> {
  if (!values?.length) {
    return;
  }

  if (options?.restrictToUserEnvironment && options.userEnvironmentId) {
    const crossEnvironmentValue = values.find((value) => value._environmentId !== options.userEnvironmentId);

    if (crossEnvironmentValue) {
      throw new ForbiddenException(
        'This authentication scheme is scoped to a single environment and cannot target a different `_environmentId`. ' +
          'Use credentials from the target environment, or authenticate with a session token.'
      );
    }
  }

  const uniqueEnvironmentIds = [...new Set(values.map((value) => value._environmentId))];

  const environments = await Promise.all(
    uniqueEnvironmentIds.map((environmentId) =>
      environmentRepository.findByIdAndOrganization(environmentId, organizationId)
    )
  );

  const invalidEnvironmentIndex = environments.findIndex((environment) => !environment);
  if (invalidEnvironmentIndex !== -1) {
    throw new NotFoundException(`Environment with id ${uniqueEnvironmentIds[invalidEnvironmentIndex]} not found`);
  }
}
