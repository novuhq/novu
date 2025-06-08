import { Injectable } from '@nestjs/common';
import _ from 'lodash';
import { NotificationTemplateEntity } from '@novu/dal';
import { createMockObjectFromSchema, FeatureFlagsKeysEnum, WorkflowOriginEnum } from '@novu/shared';
import { FeatureFlagsService } from '@novu/application-generic';
import { PreviewPayloadDto, StepResponseDto } from '../../../dtos';
import { JsonSchemaMock } from '../../../util/json-schema-mock';
import { mergeCommonObjectKeys } from '../../../util/utils';
import { PreviewCommand } from '../preview.command';
import { MockDataGeneratorService } from './mock-data-generator.service';
import { BuildStepDataUsecase } from '../../build-step-data';

@Injectable()
export class PayloadMergerService {
  constructor(
    private readonly featureFlagService: FeatureFlagsService,
    private readonly mockDataGenerator: MockDataGeneratorService,
    private readonly buildStepDataUsecase: BuildStepDataUsecase
  ) {}

  /**
   * Merges workflow payload schema with user-provided payload, handling feature flags
   * for schema-based generation vs legacy merging strategies.
   */
  async mergePayloadExample(
    workflow: NotificationTemplateEntity,
    payloadExample: Record<string, unknown>,
    userPayloadExample: PreviewPayloadDto | undefined,
    command: PreviewCommand
  ): Promise<Record<string, unknown>> {
    const isPayloadSchemaEnabled = await this.featureFlagService.getFlag({
      key: FeatureFlagsKeysEnum.IS_PAYLOAD_SCHEMA_ENABLED,
      defaultValue: false,
      organization: { _id: workflow._organizationId },
      environment: { _id: workflow._environmentId },
    });

    const isV2TemplateEditorEnabled = await this.featureFlagService.getFlag({
      key: FeatureFlagsKeysEnum.IS_V2_TEMPLATE_EDITOR_ENABLED,
      defaultValue: false,
      organization: { _id: workflow._organizationId },
      environment: { _id: workflow._environmentId },
    });

    const shouldUsePayloadSchema =
      workflow.origin === WorkflowOriginEnum.EXTERNAL ||
      (isPayloadSchemaEnabled && workflow.origin === WorkflowOriginEnum.NOVU_CLOUD);

    if (shouldUsePayloadSchema && workflow.payloadSchema) {
      return this.mergeWithPayloadSchema(
        workflow,
        payloadExample,
        userPayloadExample,
        command,
        isPayloadSchemaEnabled,
        isV2TemplateEditorEnabled
      );
    }

    return this.mergeWithoutPayloadSchema(
      payloadExample,
      userPayloadExample,
      workflow,
      command,
      isV2TemplateEditorEnabled
    );
  }

  private async mergeWithPayloadSchema(
    workflow: NotificationTemplateEntity,
    payloadExample: Record<string, unknown>,
    userPayloadExample: PreviewPayloadDto | undefined,
    command: PreviewCommand,
    isPayloadSchemaEnabled: boolean,
    isV2TemplateEditorEnabled: boolean
  ): Promise<Record<string, unknown>> {
    let schemaBasedPayloadExample: Record<string, unknown>;

    if (isPayloadSchemaEnabled) {
      try {
        const schema = {
          type: 'object' as const,
          properties: { payload: workflow.payloadSchema },
          additionalProperties: false,
        };

        const mockData = JsonSchemaMock.generate(schema) as Record<string, unknown>;
        schemaBasedPayloadExample = mockData;
      } catch (error) {
        schemaBasedPayloadExample = createMockObjectFromSchema({
          type: 'object',
          properties: { payload: workflow.payloadSchema },
        });
      }
    } else {
      schemaBasedPayloadExample = createMockObjectFromSchema({
        type: 'object',
        properties: { payload: workflow.payloadSchema },
      });
    }

    let mergedPayload = _.merge({}, payloadExample, schemaBasedPayloadExample);

    if (userPayloadExample && Object.keys(userPayloadExample).length > 0) {
      mergedPayload = _.mergeWith(
        mergedPayload,
        userPayloadExample as Record<string, unknown>,
        (objValue, srcValue) => {
          if (Array.isArray(srcValue)) {
            return srcValue;
          }

          return undefined;
        }
      );
    }

    if (isV2TemplateEditorEnabled && !mergedPayload.subscriber) {
      mergedPayload.subscriber = this.mockDataGenerator.createFullSubscriberObject();
    }

    if (isV2TemplateEditorEnabled) {
      mergedPayload.steps = await this.createFullStepsObject(workflow, command);
    }

    return mergedPayload;
  }

  private async mergeWithoutPayloadSchema(
    payloadExample: Record<string, unknown>,
    userPayloadExample: PreviewPayloadDto | undefined,
    workflow: NotificationTemplateEntity,
    command: PreviewCommand,
    isV2TemplateEditorEnabled: boolean
  ): Promise<Record<string, unknown>> {
    let finalPayload: Record<string, unknown>;

    if (userPayloadExample && Object.keys(userPayloadExample).length > 0) {
      finalPayload = mergeCommonObjectKeys(
        userPayloadExample as Record<string, unknown>,
        payloadExample as Record<string, unknown>
      );
    } else {
      finalPayload = payloadExample;
    }

    if (isV2TemplateEditorEnabled && !finalPayload.subscriber) {
      finalPayload.subscriber = this.mockDataGenerator.createFullSubscriberObject();
    }

    if (isV2TemplateEditorEnabled) {
      finalPayload.steps = await this.createFullStepsObject(workflow, command);
    }

    return finalPayload;
  }

  /**
   * Generates mock step results for all workflow steps preceding the current step,
   * enabling preview of step-dependent data in templates.
   */
  private async createFullStepsObject(
    workflow: NotificationTemplateEntity,
    command: PreviewCommand
  ): Promise<Record<string, unknown>> {
    const stepsObject: Record<string, unknown> = {};

    const currentStepData = await this.getStepData(command);
    const currentStepId = currentStepData._id;

    const currentStepIndex = workflow.steps.findIndex(
      (step) => step._id === currentStepId || step.stepId === currentStepData.stepId
    );

    if (currentStepIndex === -1) {
      return stepsObject;
    }

    const previousSteps = workflow.steps.slice(0, currentStepIndex);

    for (const step of previousSteps) {
      const stepId = step.stepId || step._id;

      if (stepId) {
        const mockResult = this.mockDataGenerator.generateMockStepResult({
          stepType: step.template?.type || '',
          workflow,
        });

        stepsObject[stepId] = mockResult;
      }
    }

    return stepsObject;
  }

  private async getStepData(command: PreviewCommand): Promise<StepResponseDto> {
    return await this.buildStepDataUsecase.execute({
      workflowIdOrInternalId: command.workflowIdOrInternalId,
      stepIdOrInternalId: command.stepIdOrInternalId,
      user: command.user,
    });
  }
}
