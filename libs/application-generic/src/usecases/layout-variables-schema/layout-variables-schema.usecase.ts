import { Injectable } from '@nestjs/common';
import { EnvironmentRepository, EnvironmentVariableRepository, JsonSchemaTypeEnum } from '@novu/dal';
import { EnvironmentSystemVariables, LAYOUT_CONTENT_VARIABLE } from '@novu/shared';
import { JSONSchemaDto } from '../../dtos/json-schema.dto';
import { resolveEnvironmentVariables } from '../../encryption/encrypt-environment-variable';
import { InstrumentUsecase } from '../../instrumentation';
import { buildContextSchema, buildEnvSchema, buildSubscriberSchema } from '../../utils/create-schema';
import { CreateVariablesObjectCommand } from '../create-variables-object/create-variables-object.command';
import { CreateVariablesObject } from '../create-variables-object/create-variables-object.usecase';
import { LayoutVariablesSchemaCommand } from './layout-variables-schema.command';

@Injectable()
export class LayoutVariablesSchemaUseCase {
  constructor(
    private readonly createVariablesObject: CreateVariablesObject,
    private readonly environmentVariableRepository: EnvironmentVariableRepository,
    private readonly environmentRepository: EnvironmentRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: LayoutVariablesSchemaCommand): Promise<JSONSchemaDto> {
    const { controlValues } = command;

    const [{ subscriber, context }, rawEnvVars, environmentEntity] = await Promise.all([
      this.createVariablesObject.execute(
        CreateVariablesObjectCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          controlValues: Object.values(controlValues?.email ?? {}),
        })
      ),
      this.environmentVariableRepository.findByEnvironment(command.organizationId, command.environmentId),
      this.environmentRepository.findByIdAndOrganization(command.environmentId, command.organizationId),
    ]);

    const systemVars: EnvironmentSystemVariables | Record<string, never> = environmentEntity
      ? { name: environmentEntity.name, type: environmentEntity.type }
      : {};
    const envVars = { ...resolveEnvironmentVariables(rawEnvVars), ...systemVars };

    return {
      type: JsonSchemaTypeEnum.OBJECT,
      properties: {
        subscriber: buildSubscriberSchema(subscriber),
        [LAYOUT_CONTENT_VARIABLE]: {
          type: JsonSchemaTypeEnum.STRING,
        },
        context: buildContextSchema(context),
        env: buildEnvSchema(envVars),
      },
      additionalProperties: false,
    };
  }
}
