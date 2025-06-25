import { NotificationTemplateEntity } from '@novu/dal';
import { createMockObjectFromSchema, FeatureFlagsKeysEnum, ResourceOriginEnum } from '@novu/shared';
import { JsonSchemaMock } from './json-schema-mock';

/**
 * Generates a payload example from a workflow's payload schema
 */
export async function generatePayloadExample(workflow: NotificationTemplateEntity): Promise<object | undefined> {
  if (!workflow.payloadSchema) {
    return undefined;
  }

  const shouldUsePayloadSchema =
    workflow.origin === ResourceOriginEnum.EXTERNAL || workflow.origin === ResourceOriginEnum.NOVU_CLOUD;

  if (!shouldUsePayloadSchema) {
    return undefined;
  }

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
    // Fallback to the original method
    const schemaBasedPayloadExample = createMockObjectFromSchema({
      type: 'object',
      properties: { payload: workflow.payloadSchema },
    });

    return schemaBasedPayloadExample.payload as object;
  }
}
