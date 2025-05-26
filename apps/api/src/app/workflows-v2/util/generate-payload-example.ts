import { NotificationTemplateEntity } from '@novu/dal';
import { createMockObjectFromSchema, FeatureFlagsKeysEnum, WorkflowOriginEnum } from '@novu/shared';
import { FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { JsonSchemaMock } from './json-schema-mock';

/**
 * Generates a payload example from a workflow's payload schema
 */
export async function generatePayloadExample(
  workflow: NotificationTemplateEntity,
  featureFlagService: FeatureFlagsService,
  logger: PinoLogger
): Promise<object | undefined> {
  if (!workflow.payloadSchema) {
    return undefined;
  }

  const isPayloadSchemaEnabled = await featureFlagService.getFlag({
    key: FeatureFlagsKeysEnum.IS_PAYLOAD_SCHEMA_ENABLED,
    defaultValue: false,
    organization: { _id: workflow._organizationId },
    environment: { _id: workflow._environmentId },
  });

  const shouldUsePayloadSchema =
    workflow.origin === WorkflowOriginEnum.EXTERNAL ||
    (isPayloadSchemaEnabled && workflow.origin === WorkflowOriginEnum.NOVU_CLOUD);

  if (!shouldUsePayloadSchema) {
    return undefined;
  }

  if (isPayloadSchemaEnabled) {
    // Use JSON schema faker for more realistic mock data
    try {
      const schema = {
        type: 'object' as const,
        properties: { payload: workflow.payloadSchema },
        additionalProperties: false,
      };
      const mockData = JsonSchemaMock.generate(schema) as Record<string, unknown>;

      return mockData.payload as object;
    } catch (error) {
      logger.warn(
        {
          err: error,
          workflowId: workflow._id,
          payloadSchema: workflow.payloadSchema,
        },
        'Failed to generate mock data using JSON schema faker, falling back to createMockObjectFromSchema'
      );
      // Fallback to the original method
      const schemaBasedPayloadExample = createMockObjectFromSchema({
        type: 'object',
        properties: { payload: workflow.payloadSchema },
      });

      return schemaBasedPayloadExample.payload as object;
    }
  } else {
    // Use the original method for external workflows when feature flag is disabled
    const schemaBasedPayloadExample = createMockObjectFromSchema({
      type: 'object',
      properties: { payload: workflow.payloadSchema },
    });

    return schemaBasedPayloadExample.payload as object;
  }
}
