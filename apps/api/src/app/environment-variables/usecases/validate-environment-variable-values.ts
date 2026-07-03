import { NotFoundException } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';

type EnvironmentVariableValueInput = {
  _environmentId: string;
};

export async function validateEnvironmentVariableValues(
  environmentRepository: EnvironmentRepository,
  organizationId: string,
  values: EnvironmentVariableValueInput[] | undefined
): Promise<void> {
  if (!values?.length) {
    return;
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
