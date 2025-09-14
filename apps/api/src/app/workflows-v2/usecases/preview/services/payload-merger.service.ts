import { Injectable } from '@nestjs/common';
import { NotificationTemplateEntity } from '@novu/dal';
import { createMockObjectFromSchema, ResourceOriginEnum, UserSessionData } from '@novu/shared';
import { isPlainObject, pick } from 'es-toolkit';
import { keys, merge, mergeWith } from 'es-toolkit/compat';
import { PreviewPayloadDto, StepResponseDto } from '../../../dtos';
import { JsonSchemaMock } from '../../../util/json-schema-mock';
import { mergeCommonObjectKeys } from '../../../util/utils';
import { BuildStepDataUsecase } from '../../build-step-data';
import { MockDataGeneratorService } from './mock-data-generator.service';

@Injectable()
export class PayloadMergerService {
  constructor(
    private readonly mockDataGenerator: MockDataGeneratorService,
    private readonly buildStepDataUsecase: BuildStepDataUsecase
  ) {}

  /**
   * Merges workflow payload schema with user-provided payload, handling feature flags
   * for schema-based generation vs legacy merging strategies.
   */
  async mergePayloadExample({
    workflow,
    payloadExample,
    userPayloadExample,
    stepIdOrInternalId,
    user,
  }: {
    workflow?: NotificationTemplateEntity;
    payloadExample: Record<string, unknown>;
    userPayloadExample: PreviewPayloadDto | undefined;
    stepIdOrInternalId?: string;
    user: UserSessionData;
  }): Promise<Record<string, unknown>> {
    const shouldUsePayloadSchema =
      workflow?.origin === ResourceOriginEnum.EXTERNAL || workflow?.origin === ResourceOriginEnum.NOVU_CLOUD;

    if (shouldUsePayloadSchema && workflow?.payloadSchema) {
      return this.mergeWithPayloadSchema({
        workflow,
        payloadExample,
        userPayloadExample,
        stepIdOrInternalId,
        user,
      });
    }

    return this.mergeWithoutPayloadSchema({
      payloadExample,
      userPayloadExample,
      workflow,
      stepIdOrInternalId,
      user,
    });
  }

  private async mergeWithPayloadSchema({
    workflow,
    payloadExample,
    userPayloadExample,
    stepIdOrInternalId,
    user,
  }: {
    workflow: NotificationTemplateEntity;
    payloadExample: Record<string, unknown>;
    userPayloadExample: PreviewPayloadDto | undefined;
    stepIdOrInternalId?: string;
    user: UserSessionData;
  }): Promise<Record<string, unknown>> {
    let schemaBasedPayloadExample: Record<string, unknown>;

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

    let mergedPayload = merge({}, schemaBasedPayloadExample);

    if (userPayloadExample && Object.keys(userPayloadExample).length > 0) {
      // Filter userPayloadExample to only include keys that exist in schemaBasedPayloadExample
      const filteredUserPayload = this.filterPayloadBySchema(
        userPayloadExample as Record<string, unknown>,
        schemaBasedPayloadExample
      );

      mergedPayload = mergeWith(mergedPayload, filteredUserPayload, (objValue, srcValue) => {
        if (Array.isArray(srcValue)) {
          return srcValue;
        }

        return undefined;
      });
    }

    const fullSubscriberSchema = this.mockDataGenerator.createFullSubscriberObject();
    // Preserve user-provided subscriber data even if it was filtered out earlier
    const userSubscriberData = (userPayloadExample?.subscriber as Record<string, unknown>) || {};

    mergedPayload.subscriber = merge({}, fullSubscriberSchema, userSubscriberData);

    if (workflow && stepIdOrInternalId) {
      /*
       * Preserve steps from payloadExample (which contains correctly generated digest events)
       * and merge with user-provided steps and mock data for missing steps
       */
      const stepsFromPayloadExample = (payloadExample.steps as Record<string, unknown>) || {};
      const generatedStepsObject = await this.createFullStepsObject({
        workflow,
        stepIdOrInternalId,
        user,
        userPayloadExample,
      });

      /*
       * Merge with priority: user steps > payloadExample steps > generated mock steps
       * Use mergeWith to ensure user-provided data (including empty objects) takes precedence
       */
      mergedPayload.steps = mergeWith(
        {},
        generatedStepsObject,
        stepsFromPayloadExample,
        (userPayloadExample?.steps as Record<string, unknown>) || {},
        (objValue, srcValue) => {
          // If source value is provided by user, always use it (even if it's an empty object)
          if (srcValue !== undefined) {
            return srcValue;
          }

          return undefined; // Let lodash handle the merge
        }
      );
    }

    return mergedPayload;
  }

  private async mergeWithoutPayloadSchema({
    payloadExample,
    userPayloadExample,
    workflow,
    stepIdOrInternalId,
    user,
  }: {
    payloadExample: Record<string, unknown>;
    userPayloadExample: PreviewPayloadDto | undefined;
    workflow?: NotificationTemplateEntity;
    user: UserSessionData;
    stepIdOrInternalId?: string;
  }): Promise<Record<string, unknown>> {
    let finalPayload: Record<string, unknown>;

    if (userPayloadExample && Object.keys(userPayloadExample).length > 0) {
      finalPayload = mergeCommonObjectKeys(
        userPayloadExample as Record<string, unknown>,
        payloadExample as Record<string, unknown>
      );
    } else {
      finalPayload = payloadExample;
    }

    const fullSubscriberSchema = this.mockDataGenerator.createFullSubscriberObject();
    // Preserve user-provided subscriber data even if it was filtered out earlier
    const userSubscriberData = (userPayloadExample?.subscriber as Record<string, unknown>) || {};

    finalPayload.subscriber = merge({}, fullSubscriberSchema, userSubscriberData);

    if (workflow && stepIdOrInternalId) {
      /*
       * Preserve steps from payloadExample (which contains correctly generated digest events)
       * and merge with user-provided steps and mock data for missing steps
       */

      const stepsFromPayloadExample = (payloadExample.steps as Record<string, unknown>) || {};
      const generatedStepsObject = await this.createFullStepsObject({
        workflow,
        stepIdOrInternalId,
        user,
        userPayloadExample,
      });
      /*
       * Merge with priority: user steps > payloadExample steps > generated mock steps
       * Use mergeWith to ensure user-provided data (including empty objects) takes precedence
       */
      finalPayload.steps = mergeWith(
        {},
        generatedStepsObject,
        stepsFromPayloadExample,
        (userPayloadExample?.steps as Record<string, unknown>) || {},
        (objValue, srcValue) => {
          // If source value is provided by user, always use it (even if it's an empty object)
          if (srcValue !== undefined) {
            return srcValue;
          }

          return undefined; // Let lodash handle the merge
        }
      );
    }

    return finalPayload;
  }

  /**
   * Generates mock step results for all workflow steps preceding the current step,
   * enabling preview of step-dependent data in templates.
   */
  private async createFullStepsObject({
    workflow,
    stepIdOrInternalId,
    user,
    userPayloadExample,
  }: {
    workflow: NotificationTemplateEntity;
    stepIdOrInternalId: string;
    user: UserSessionData;
    userPayloadExample?: PreviewPayloadDto;
  }): Promise<Record<string, unknown>> {
    const stepsObject: Record<string, unknown> = {};
    const currentStepData = await this.getStepData({
      workflowIdOrInternalId: workflow._id,
      stepIdOrInternalId,
      user,
    });
    const currentStepId = currentStepData._id;

    const currentStepIndex = workflow.steps.findIndex(
      (step) => step._id === currentStepId || step.stepId === currentStepData.stepId
    );

    if (currentStepIndex === -1) {
      return stepsObject;
    }

    const previousSteps = workflow.steps.slice(0, currentStepIndex);
    const userStepsData = (userPayloadExample?.steps as Record<string, unknown>) || {};

    for (const step of previousSteps) {
      const stepId = step.stepId || step._id;

      if (stepId) {
        if (userStepsData[stepId]) {
          stepsObject[stepId] = userStepsData[stepId];
        } else {
          // Fall back to generating mock data
          const mockResult = this.mockDataGenerator.generateMockStepResult({
            stepType: step.template?.type || '',
            workflow,
          });

          stepsObject[stepId] = mockResult;
        }
      }
    }

    return stepsObject;
  }

  private async getStepData({
    workflowIdOrInternalId,
    stepIdOrInternalId,
    user,
  }: {
    workflowIdOrInternalId: string;
    stepIdOrInternalId: string;
    user: UserSessionData;
  }): Promise<StepResponseDto> {
    return await this.buildStepDataUsecase.execute({
      workflowIdOrInternalId,
      stepIdOrInternalId,
      user,
    });
  }

  /**
   * Recursively filters the user payload to only include keys that exist in the schema-based payload
   */
  private filterPayloadBySchema(
    userPayload: Record<string, unknown>,
    schemaPayload: Record<string, unknown>
  ): Record<string, unknown> {
    // Use lodash pick to only include keys that exist in the schema
    const filtered = pick(userPayload, keys(schemaPayload));

    // Recursively filter nested objects and arrays
    for (const [key, value] of Object.entries(filtered)) {
      if (isPlainObject(value) && isPlainObject(schemaPayload[key])) {
        filtered[key] = this.filterPayloadBySchema(
          value as Record<string, unknown>,
          schemaPayload[key] as Record<string, unknown>
        );
      } else if (Array.isArray(value) && Array.isArray(schemaPayload[key])) {
        // Handle arrays by filtering each element
        filtered[key] = value.map((item) => {
          if (isPlainObject(item) && schemaPayload[key] && Array.isArray(schemaPayload[key])) {
            const schemaArray = schemaPayload[key] as unknown[];
            // Use the first element of the schema array as the template for filtering
            const schemaTemplate =
              schemaArray.length > 0 && isPlainObject(schemaArray[0])
                ? (schemaArray[0] as Record<string, unknown>)
                : {};

            return this.filterPayloadBySchema(item as Record<string, unknown>, schemaTemplate);
          }

          return item;
        });
      }
    }

    return filtered;
  }
}
