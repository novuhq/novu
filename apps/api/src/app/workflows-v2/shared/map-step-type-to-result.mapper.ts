import { JSONSchema } from '@novu/application-generic';
import { JsonSchemaTypeEnum } from '@novu/dal';
import { ActionStepEnum, actionStepSchemas, ChannelStepEnum, channelStepSchemas } from '@novu/framework/internal';
import { StepTypeEnum } from '@novu/shared';

export function computeResultSchema({
  stepType,
  payloadSchema,
  isEnhancedDigestEnabled,
}: {
  stepType: StepTypeEnum;
  payloadSchema?: JSONSchema;
  isEnhancedDigestEnabled: boolean;
}) {
  const mapStepTypeToResult: Record<ChannelStepEnum & ActionStepEnum, JSONSchema> = {
    [ChannelStepEnum.SMS]: channelStepSchemas[ChannelStepEnum.SMS].result,
    [ChannelStepEnum.EMAIL]: channelStepSchemas[ChannelStepEnum.EMAIL].result,
    [ChannelStepEnum.PUSH]: channelStepSchemas[ChannelStepEnum.PUSH].result,
    [ChannelStepEnum.CHAT]: channelStepSchemas[ChannelStepEnum.CHAT].result,
    [ChannelStepEnum.IN_APP]: channelStepSchemas[ChannelStepEnum.IN_APP].result,
    [ActionStepEnum.DELAY]: actionStepSchemas[ActionStepEnum.DELAY].result,
    [ActionStepEnum.DIGEST]: buildDigestResult({ payloadSchema, isEnhancedDigestEnabled }),
  };

  return mapStepTypeToResult[stepType];
}

function buildDigestResult({
  payloadSchema,
  isEnhancedDigestEnabled,
}: {
  payloadSchema?: JSONSchema;
  isEnhancedDigestEnabled: boolean;
}): JSONSchema {
  return {
    type: JsonSchemaTypeEnum.OBJECT,
    properties: {
      ...(isEnhancedDigestEnabled ? { eventCount: { type: JsonSchemaTypeEnum.NUMBER } } : {}),
      events: {
        type: JsonSchemaTypeEnum.ARRAY,
        properties: {
          // the length property is JS native property on arrays
          length: {
            type: JsonSchemaTypeEnum.NUMBER,
          },
        },
        items: {
          type: JsonSchemaTypeEnum.OBJECT,
          properties: {
            id: {
              type: JsonSchemaTypeEnum.STRING,
            },
            time: {
              type: JsonSchemaTypeEnum.STRING,
            },
            payload:
              payloadSchema && typeof payloadSchema === 'object'
                ? { ...payloadSchema, additionalProperties: true }
                : {
                    type: JsonSchemaTypeEnum.OBJECT,
                    additionalProperties: true,
                  },
          },
          required: ['id', 'time', 'payload'],
          additionalProperties: false,
        },
      },
    },
    required: ['events'],
    additionalProperties: false,
  };
}
