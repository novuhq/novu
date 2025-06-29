import { Injectable } from '@nestjs/common';
import { JsonSchemaTypeEnum, NotificationStepEntity, NotificationTemplateEntity } from '@novu/dal';
import { FeatureFlagsService, Instrument } from '@novu/application-generic';
import { computeResultSchema } from '../../shared';
import { BuildVariableSchemaCommand } from './build-available-variable-schema.command';
import { parsePayloadSchema } from '../../shared/parse-payload-schema';
import { CreateVariablesObjectCommand } from '../create-variables-object/create-variables-object.command';
import { CreateVariablesObject } from '../create-variables-object/create-variables-object.usecase';
import { emptyJsonSchema } from '../../util/jsonToSchema';
import { buildSubscriberSchema, buildVariablesSchema } from '../../../shared/utils/create-schema';
import { JSONSchemaDto } from '../../../shared/dtos/json-schema.dto';

@Injectable()
export class BuildVariableSchemaUsecase {
  constructor(
    private readonly createVariablesObject: CreateVariablesObject,
    private readonly featureFlagService: FeatureFlagsService
  ) {}

  async execute(command: BuildVariableSchemaCommand): Promise<JSONSchemaDto> {
    const { workflow, stepInternalId } = command;
    const previousSteps = workflow?.steps.slice(
      0,
      workflow?.steps.findIndex((stepItem) => stepItem._id === stepInternalId)
    );
    const { payload, subscriber } = await this.createVariablesObject.execute(
      CreateVariablesObjectCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        workflowId: workflow?._id,
        ...(command.optimisticControlValues ? { controlValues: command.optimisticControlValues } : {}),
      })
    );

    return {
      type: JsonSchemaTypeEnum.OBJECT,
      properties: {
        subscriber: buildSubscriberSchema(subscriber),
        steps: buildPreviousStepsSchema({
          previousSteps,
          payloadSchema: workflow?.payloadSchema,
        }),
        payload: await this.resolvePayloadSchema(workflow, payload),
      },
      additionalProperties: false,
    } as const satisfies JSONSchemaDto;
  }

  @Instrument()
  private async resolvePayloadSchema(
    workflow: NotificationTemplateEntity | undefined,
    payload: unknown
  ): Promise<JSONSchemaDto> {
    if (workflow && workflow.steps.length === 0) {
      return {
        type: JsonSchemaTypeEnum.OBJECT,
        properties: {},
        additionalProperties: true,
      };
    }

    if (workflow?.payloadSchema) {
      return parsePayloadSchema(workflow.payloadSchema, { safe: true }) || emptyJsonSchema();
    }

    return buildVariablesSchema(payload);
  }
}

function buildPreviousStepsProperties({
  previousSteps,
  payloadSchema,
}: {
  previousSteps: NotificationStepEntity[] | undefined;
  payloadSchema?: JSONSchemaDto;
}) {
  return (previousSteps || []).reduce(
    (acc, step) => {
      if (step.stepId && step.template?.type) {
        acc[step.stepId] = computeResultSchema({
          stepType: step.template.type,
          payloadSchema,
        });
      }

      return acc;
    },
    {} as Record<string, JSONSchemaDto>
  );
}

function buildPreviousStepsSchema({
  previousSteps,
  payloadSchema,
}: {
  previousSteps: NotificationStepEntity[] | undefined;
  payloadSchema?: JSONSchemaDto;
}): JSONSchemaDto {
  return {
    type: JsonSchemaTypeEnum.OBJECT,
    properties: buildPreviousStepsProperties({
      previousSteps,
      payloadSchema,
    }),
    required: [],
    additionalProperties: false,
    description: 'Previous Steps Results',
  } as const satisfies JSONSchemaDto;
}
