import { Injectable } from '@nestjs/common';
import { JsonSchemaFormatEnum, JsonSchemaTypeEnum } from '@novu/dal';

import { merge } from 'es-toolkit/compat';
import { JSONSchemaDto } from '../../../../shared/dtos/json-schema.dto';
import { buildVariablesSchema } from '../../../../shared/utils/create-schema';
import { PreviewPayloadDto } from '../../../dtos';

@Injectable()
export class SchemaBuilderService {
  async buildVariablesSchema(
    variablesObject: Record<string, unknown>,
    variables: JSONSchemaDto
  ): Promise<JSONSchemaDto> {
    const { payload } = variablesObject;
    const payloadSchema = buildVariablesSchema(payload);

    if (Object.keys(payloadSchema).length === 0) {
      return variables;
    }

    return merge(variables, { properties: { payload: payloadSchema } });
  }

  async buildPreviewPayloadSchema(
    previewPayloadExample: PreviewPayloadDto,
    workflowPayloadSchema?: JSONSchemaDto
  ): Promise<JSONSchemaDto | null> {
    if (!workflowPayloadSchema) {
      return null;
    }

    const schema: JSONSchemaDto = {
      type: JsonSchemaTypeEnum.OBJECT,
      properties: {},
      additionalProperties: false,
    };

    if (previewPayloadExample.payload) {
      schema.properties!.payload = workflowPayloadSchema || {
        type: JsonSchemaTypeEnum.OBJECT,
        additionalProperties: true,
      };
    }

    schema.properties!.subscriber = {
      type: JsonSchemaTypeEnum.OBJECT,
      properties: {
        subscriberId: { type: JsonSchemaTypeEnum.STRING },
        firstName: { type: JsonSchemaTypeEnum.STRING },
        lastName: { type: JsonSchemaTypeEnum.STRING },
        email: { type: JsonSchemaTypeEnum.STRING, format: JsonSchemaFormatEnum.EMAIL },
        phone: { type: JsonSchemaTypeEnum.STRING },
        avatar: { type: JsonSchemaTypeEnum.STRING },
        locale: { type: JsonSchemaTypeEnum.STRING },
        timezone: { type: JsonSchemaTypeEnum.STRING },
        data: { type: JsonSchemaTypeEnum.OBJECT, additionalProperties: true },
      },
      additionalProperties: true,
    };

    schema.properties!.steps = {
      type: JsonSchemaTypeEnum.OBJECT,
      description: 'Steps data from previous workflow executions',
      additionalProperties: {
        type: JsonSchemaTypeEnum.OBJECT,
        properties: {
          eventCount: { type: JsonSchemaTypeEnum.NUMBER },
          events: {
            type: JsonSchemaTypeEnum.ARRAY,
            items: {
              type: JsonSchemaTypeEnum.OBJECT,
              properties: {
                payload: { type: JsonSchemaTypeEnum.OBJECT, additionalProperties: true },
              },
              additionalProperties: true,
            },
          },
        },
        additionalProperties: true,
      },
    };

    return schema;
  }
}
