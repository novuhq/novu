import { Injectable } from '@nestjs/common';
import { FeatureFlagsService, Instrument, InstrumentUsecase } from '@novu/application-generic';
import {
  ControlValuesRepository,
  JsonSchemaTypeEnum,
  NotificationStepEntity,
  NotificationTemplateEntity,
} from '@novu/dal';
import { ControlValuesLevelEnum, FeatureFlagsKeysEnum, StepTypeEnum } from '@novu/shared';
import { JSONSchemaDto } from '../../../shared/dtos/json-schema.dto';
import { CreateVariablesObjectCommand } from '../../../shared/usecases/create-variables-object/create-variables-object.command';
import { CreateVariablesObject } from '../../../shared/usecases/create-variables-object/create-variables-object.usecase';
import { buildSubscriberSchema, buildVariablesSchema, buildWorkflowSchema } from '../../../shared/utils/create-schema';
import { computeResultSchema } from '../../shared';
import { parsePayloadSchema } from '../../shared/parse-payload-schema';
import { emptyJsonSchema } from '../../util/jsonToSchema';
import { BuildVariableSchemaCommand, IOptimisticStepInfo } from './build-available-variable-schema.command';

@Injectable()
export class BuildVariableSchemaUsecase {
  constructor(
    private readonly createVariablesObject: CreateVariablesObject,
    private readonly controlValuesRepository: ControlValuesRepository,
    private readonly featureFlagsService: FeatureFlagsService
  ) {}

  @InstrumentUsecase()
  async execute(command: BuildVariableSchemaCommand): Promise<JSONSchemaDto> {
    const { workflow, stepInternalId, optimisticSteps } = command;

    let workflowControlValues: unknown[] = [];
    if (workflow) {
      const controls = await this.controlValuesRepository.find(
        {
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
          _workflowId: workflow._id,
          level: ControlValuesLevelEnum.STEP_CONTROLS,
          controls: { $ne: null },
        },
        {
          controls: 1,
          _id: 0,
        }
      );

      workflowControlValues = controls
        .flatMap((item) => item.controls)
        .flatMap((obj) => Object.values(obj as Record<string, unknown>));
    }

    const optimisticControlValues = Object.values(command.optimisticControlValues || {});
    const { payload, subscriber } = await this.createVariablesObject.execute(
      CreateVariablesObjectCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        controlValues: optimisticControlValues.length > 0 ? optimisticControlValues : workflowControlValues,
      })
    );

    // Build effective steps by combining persisted steps with optimistic steps
    const effectiveSteps = this.buildEffectiveSteps(workflow, optimisticSteps);

    const previousSteps = effectiveSteps?.slice(0, this.findStepIndex(effectiveSteps, stepInternalId));

    const isNotificationSeverityEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_NOTIFICATION_SEVERITY_ENABLED,
      organization: { _id: command.organizationId },
      environment: { _id: command.environmentId },
      user: { _id: command.userId },
      defaultValue: false,
    });

    return {
      type: JsonSchemaTypeEnum.OBJECT,
      properties: {
        ...(isNotificationSeverityEnabled ? { workflow: buildWorkflowSchema() } : {}),
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

  /**
   * Builds effective steps for schema generation by combining persisted workflow steps
   * with optimistic steps (used during sync scenarios)
   */
  private buildEffectiveSteps(
    workflow: NotificationTemplateEntity | undefined,
    optimisticSteps: IOptimisticStepInfo[] | undefined
  ): Array<NotificationStepEntity | IOptimisticStepInfo> | undefined {
    if (!optimisticSteps) {
      return workflow?.steps;
    }

    // During sync, we need to consider both existing steps and optimistic steps
    const existingSteps = workflow?.steps || [];

    // Create a map of existing step IDs to avoid duplicates
    const existingStepIds = new Set(existingSteps.map((step) => step.stepId).filter(Boolean));

    // Add optimistic steps that don't already exist
    const newOptimisticSteps = optimisticSteps.filter((step) => !existingStepIds.has(step.stepId));

    return [...existingSteps, ...newOptimisticSteps];
  }

  /**
   * Finds the index of a step in the effective steps array
   */
  private findStepIndex(
    effectiveSteps: Array<NotificationStepEntity | IOptimisticStepInfo> | undefined,
    stepInternalId: string | undefined
  ): number {
    if (!effectiveSteps || !stepInternalId) {
      return effectiveSteps?.length || 0;
    }

    /*
     * For persisted steps, match by _id; for optimistic steps, this will return -1
     * which means we include all steps when validating optimistic steps
     */
    const index = effectiveSteps.findIndex((step) =>
      'stepId' in step && '_id' in step ? step._id === stepInternalId : false
    );

    return index === -1 ? effectiveSteps.length : index;
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
  previousSteps: Array<NotificationStepEntity | IOptimisticStepInfo> | undefined;
  payloadSchema?: JSONSchemaDto;
}) {
  return (previousSteps || []).reduce(
    (acc, step) => {
      // Handle both persisted steps and optimistic steps
      let stepId: string | undefined;
      let stepType: StepTypeEnum | undefined;

      if ('template' in step && step.template?.type) {
        // Persisted step
        stepId = step.stepId;
        stepType = step.template.type;
      } else if ('type' in step) {
        // Optimistic step
        stepId = step.stepId;
        stepType = step.type;
      }

      if (stepId && stepType) {
        acc[stepId] = computeResultSchema({
          stepType,
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
  previousSteps: Array<NotificationStepEntity | IOptimisticStepInfo> | undefined;
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
