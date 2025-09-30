import { Injectable } from '@nestjs/common';
import { JsonSchemaFormatEnum, JsonSchemaTypeEnum } from '@novu/dal';
import { ContextPayload } from '@novu/shared';
import { merge } from 'es-toolkit/compat';
import { JSONSchemaDto } from '../../../../shared/dtos/json-schema.dto';
import { buildVariablesSchema } from '../../../../shared/utils/create-schema';
import { SubscriberResponseDtoOptional } from '../../../../subscribers/dtos/subscriber-response.dto';
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

    // Always include context schema
    schema.properties!.context = previewPayloadExample.context 
      ? this.buildContextSchema(previewPayloadExample.context)
      : this.getDefaultContextSchema();

    // Build dynamic subscriber schema based on actual subscriber data
    schema.properties!.subscriber = this.buildSubscriberSchema(previewPayloadExample.subscriber);

    schema.properties!.steps = this.getStepsSchema();

    return schema;
  }

  private buildContextSchema(context: ContextPayload): JSONSchemaDto {
    const contextProperties: Record<string, JSONSchemaDto> = {};

    // Build schema for each context entity (tenant, user, organization, etc.)
    for (const [entityType, entityValue] of Object.entries(context)) {
      if (entityValue && typeof entityValue === 'object') {
        const entity = entityValue as Record<string, unknown>;

        // Each context entity should have id and data properties
        const entitySchema: JSONSchemaDto = {
          type: JsonSchemaTypeEnum.OBJECT,
          properties: {
            id: { type: JsonSchemaTypeEnum.STRING },
            data: entity.data
              ? buildVariablesSchema(entity.data) // Dynamic schema for entity.data
              : { type: JsonSchemaTypeEnum.OBJECT, additionalProperties: true },
          },
          required: ['id'],
          additionalProperties: false, // Only allow id and data
        };

        contextProperties[entityType] = entitySchema;
      }
    }

    return {
      type: JsonSchemaTypeEnum.OBJECT,
      description: 'Context data for the workflow execution',
      properties: contextProperties,
      additionalProperties: true, // Allow new entity types to be added
    };
  }

  private buildSubscriberSchema(subscriber?: SubscriberResponseDtoOptional): JSONSchemaDto {
    // Build dynamic schema for subscriber.data if subscriber exists and has data
    const dynamicDataSchema = subscriber?.data
      ? buildVariablesSchema(subscriber.data)
      : { type: JsonSchemaTypeEnum.OBJECT, additionalProperties: true };

    return {
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
        data: dynamicDataSchema,
      },
      additionalProperties: false,
    };
  }

  private getStepsSchema(): JSONSchemaDto {
    return {
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
  }

  private getDefaultContextSchema(): JSONSchemaDto {
    return {
      type: JsonSchemaTypeEnum.OBJECT,
      description: 'Context data for the workflow execution',
      properties: {},
      additionalProperties: true,
    };
  }
}
