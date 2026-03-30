import { Injectable } from '@nestjs/common';
import {
  ControlValuesEntity,
  ControlValuesRepository,
  EnvironmentRepository,
  EnvironmentVariableRepository,
  JsonSchemaTypeEnum,
  NotificationStepEntity,
  NotificationTemplateEntity,
} from '@novu/dal';
import { ControlValuesLevelEnum, EnvironmentSystemVariables, StepTypeEnum } from '@novu/shared';
import { JSONSchemaDto } from '../../dtos/json-schema.dto';
import { PreviewPayloadDto } from '../../dtos/workflow/preview-payload.dto';
import { resolveEnvironmentVariables } from '../../encryption/encrypt-environment-variable';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import {
  buildContextSchema,
  buildEnvSchema,
  buildSubscriberSchema,
  buildVariablesSchema,
  buildWorkflowSchema,
} from '../../utils/create-schema';
import { emptyJsonSchema } from '../../utils/jsonToSchema';
import { computeResultSchema } from '../../utils/map-step-type-to-result.mapper';
import { parsePayloadSchema } from '../../utils/parse-payload-schema';
import { CreateVariablesObject, CreateVariablesObjectCommand } from '../create-variables-object';
import { BuildVariableSchemaCommand, IOptimisticStepInfo } from './build-available-variable-schema.command';

type SelectedControlValuesFields = Pick<ControlValuesEntity, 'controls' | '_stepId'>;

const SELECTED_CONTROL_VALUES_PROJECTION: Record<keyof SelectedControlValuesFields, 1> & { _id: 0 } = {
  controls: 1,
  _stepId: 1,
  _id: 0,
} as const;

@Injectable()
export class BuildVariableSchemaUsecase {
  constructor(
    private readonly createVariablesObject: CreateVariablesObject,
    private readonly controlValuesRepository: ControlValuesRepository,
    private readonly environmentVariableRepository: EnvironmentVariableRepository,
    private readonly environmentRepository: EnvironmentRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: BuildVariableSchemaCommand): Promise<JSONSchemaDto> {
    const { workflow, stepInternalId, optimisticSteps, previewData, preloadedControlValues, optimisticPayloadSchema } =
      command;

    let workflowControlValues: unknown[] = [];
    let controls: SelectedControlValuesFields[] = [];
    if (workflow) {
      if (preloadedControlValues) {
        controls = preloadedControlValues as SelectedControlValuesFields[];
      } else {
        controls = await this.controlValuesRepository.find(
          {
            _environmentId: command.environmentId,
            _organizationId: command.organizationId,
            _workflowId: workflow._id,
            level: ControlValuesLevelEnum.STEP_CONTROLS,
            controls: { $ne: null },
          },
          SELECTED_CONTROL_VALUES_PROJECTION
        );
      }

      workflowControlValues = controls
        .flatMap((item) => item.controls)
        .filter(Boolean)
        .flatMap((obj) => Object.values(obj as Record<string, unknown>));
    }

    const optimisticControlValues = Object.values(command.optimisticControlValues || {});
    const { payload, subscriber, context } = await this.createVariablesObject.execute(
      CreateVariablesObjectCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        controlValues: optimisticControlValues.length > 0 ? optimisticControlValues : workflowControlValues,
      })
    );

    const {
      payload: finalPayload,
      subscriber: finalSubscriber,
      context: finalContext,
    } = previewData
      ? this.mergePreviewData({ payload, subscriber, context }, previewData)
      : { payload: payload || {}, subscriber: subscriber || {}, context: context || {} };

    const effectiveSteps = this.buildEffectiveSteps(workflow, optimisticSteps);

    const previousSteps = effectiveSteps?.slice(0, this.findStepIndex(effectiveSteps, stepInternalId));

    const effectivePayloadSchema = optimisticPayloadSchema ?? workflow?.payloadSchema;

    const [rawEnvVars, environmentEntity] = await Promise.all([
      this.environmentVariableRepository.findByEnvironment(command.organizationId, command.environmentId),
      this.environmentRepository.findByIdAndOrganization(command.environmentId, command.organizationId),
    ]);
    const systemVars: EnvironmentSystemVariables | Record<string, never> = environmentEntity
      ? { name: environmentEntity.name, type: environmentEntity.type }
      : {};
    const envVars = { ...resolveEnvironmentVariables(rawEnvVars), ...systemVars };
    const controlValuesMap: Record<string, Record<string, unknown>> = {};
    for (const cv of controls) {
      if (cv._stepId) {
        controlValuesMap[cv._stepId] = cv.controls;
      }
    }

    return {
      type: JsonSchemaTypeEnum.OBJECT,
      properties: {
        workflow: buildWorkflowSchema(),
        subscriber: buildSubscriberSchema(finalSubscriber),
        steps: buildPreviousStepsSchema({
          previousSteps,
          payloadSchema: effectivePayloadSchema,
          controlValuesMap,
        }),
        payload: await this.resolvePayloadSchema(workflow, finalPayload, optimisticPayloadSchema),
        context: buildContextSchema(finalContext),
        env: buildEnvSchema(envVars),
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
    payload: unknown,
    optimisticPayloadSchema?: JSONSchemaDto
  ): Promise<JSONSchemaDto> {
    if (optimisticPayloadSchema) {
      return parsePayloadSchema(optimisticPayloadSchema, { safe: true }) || emptyJsonSchema();
    }

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

  /**
   * Merges preview data with extracted variables for preview scenarios
   */
  private mergePreviewData(
    extracted: { payload?: unknown; subscriber?: unknown; context?: unknown },
    previewData?: PreviewPayloadDto
  ): { payload: Record<string, unknown>; subscriber: Record<string, unknown>; context: Record<string, unknown> } {
    return {
      payload: { ...((extracted.payload as Record<string, unknown>) || {}), ...(previewData?.payload || {}) },
      subscriber: { ...((extracted.subscriber as Record<string, unknown>) || {}), ...(previewData?.subscriber || {}) },
      context: { ...((extracted.context as Record<string, unknown>) || {}), ...(previewData?.context || {}) },
    };
  }
}

function buildPreviousStepsProperties({
  previousSteps,
  payloadSchema,
  controlValuesMap,
}: {
  previousSteps: Array<NotificationStepEntity | IOptimisticStepInfo> | undefined;
  payloadSchema?: JSONSchemaDto;
  controlValuesMap?: Record<string, Record<string, unknown>>;
}) {
  return (previousSteps || []).reduce(
    (acc, step) => {
      let stepId: string | undefined;
      let stepType: StepTypeEnum | undefined;
      let responseBodySchema: JSONSchemaDto | undefined;

      if ('template' in step && step.template?.type) {
        stepId = step.stepId;
        stepType = step.template.type;

        if (stepType === StepTypeEnum.HTTP_REQUEST && step._id && controlValuesMap) {
          const stepControls = controlValuesMap[step._id];
          if (stepControls?.responseBodySchema) {
            responseBodySchema = stepControls.responseBodySchema as JSONSchemaDto;
          }
        }
      } else if ('type' in step) {
        stepId = step.stepId;
        stepType = step.type;
      }

      if (stepId && stepType) {
        acc[stepId] = computeResultSchema({
          stepType,
          payloadSchema,
          responseBodySchema,
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
  controlValuesMap,
}: {
  previousSteps: Array<NotificationStepEntity | IOptimisticStepInfo> | undefined;
  payloadSchema?: JSONSchemaDto;
  controlValuesMap?: Record<string, Record<string, unknown>>;
}): JSONSchemaDto {
  return {
    type: JsonSchemaTypeEnum.OBJECT,
    properties: buildPreviousStepsProperties({
      previousSteps,
      payloadSchema,
      controlValuesMap,
    }),
    required: [],
    additionalProperties: false,
    description: 'Previous Steps Results',
  } as const satisfies JSONSchemaDto;
}
