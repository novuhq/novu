import { Injectable } from '@nestjs/common';
import {
  EnvironmentEntity,
  NotificationStepEntity,
  NotificationTemplateEntity,
  OrganizationEntity,
  UserEntity,
} from '@novu/dal';
import { FeatureFlagsKeysEnum, JSONSchemaDto } from '@novu/shared';
import { FeatureFlagsService, Instrument } from '@novu/application-generic';
import { computeResultSchema } from '../../shared';
import { BuildVariableSchemaCommand } from './build-available-variable-schema.command';
import { parsePayloadSchema } from '../../shared/parse-payload-schema';
import { CreateVariablesObjectCommand } from '../create-variables-object/create-variables-object.command';
import { CreateVariablesObject } from '../create-variables-object/create-variables-object.usecase';
import { emptyJsonSchema } from '../../util/jsonToSchema';
import { buildVariablesSchema } from '../../util/create-schema';

@Injectable()
export class BuildVariableSchemaUsecase {
  constructor(
    private readonly createVariablesObject: CreateVariablesObject,
    private readonly featureFlagService: FeatureFlagsService
  ) {}

  async execute(command: BuildVariableSchemaCommand): Promise<JSONSchemaDto> {
    const isEnhancedDigestEnabled = await this.featureFlagService.getFlag({
      user: { _id: command.userId } as UserEntity,
      environment: { _id: command.environmentId } as EnvironmentEntity,
      organization: { _id: command.organizationId } as OrganizationEntity,
      key: FeatureFlagsKeysEnum.IS_ENHANCED_DIGEST_ENABLED,
      defaultValue: false,
    });
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
      type: 'object',
      properties: {
        subscriber: {
          type: 'object',
          description: 'Schema representing the subscriber entity',
          properties: {
            firstName: { type: 'string', description: "Subscriber's first name" },
            lastName: { type: 'string', description: "Subscriber's last name" },
            email: { type: 'string', description: "Subscriber's email address" },
            phone: { type: 'string', description: "Subscriber's phone number (optional)" },
            avatar: { type: 'string', description: "URL to the subscriber's avatar image (optional)" },
            locale: { type: 'string', description: 'Locale for the subscriber (optional)' },
            subscriberId: { type: 'string', description: 'Unique identifier for the subscriber' },
            isOnline: { type: 'boolean', description: 'Indicates if the subscriber is online (optional)' },
            lastOnlineAt: {
              type: 'string',
              format: 'date-time',
              description: 'The last time the subscriber was online (optional)',
            },
            data: buildVariablesSchema(
              subscriber && typeof subscriber === 'object' && 'data' in subscriber ? subscriber.data : {}
            ),
          },
          required: ['firstName', 'lastName', 'email', 'subscriberId'],
          additionalProperties: false,
        },
        steps: buildPreviousStepsSchema({
          previousSteps,
          payloadSchema: workflow?.payloadSchema,
          isEnhancedDigestEnabled,
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
        type: 'object',
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
  isEnhancedDigestEnabled,
}: {
  previousSteps: NotificationStepEntity[] | undefined;
  payloadSchema?: JSONSchemaDto;
  isEnhancedDigestEnabled: boolean;
}) {
  return (previousSteps || []).reduce(
    (acc, step) => {
      if (step.stepId && step.template?.type) {
        acc[step.stepId] = computeResultSchema({
          stepType: step.template.type,
          payloadSchema,
          isEnhancedDigestEnabled,
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
  isEnhancedDigestEnabled,
}: {
  previousSteps: NotificationStepEntity[] | undefined;
  payloadSchema?: JSONSchemaDto;
  isEnhancedDigestEnabled: boolean;
}): JSONSchemaDto {
  return {
    type: 'object',
    properties: buildPreviousStepsProperties({
      previousSteps,
      payloadSchema,
      isEnhancedDigestEnabled,
    }),
    required: [],
    additionalProperties: false,
    description: 'Previous Steps Results',
  } as const satisfies JSONSchemaDto;
}
