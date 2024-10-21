import { JSONSchemaDto } from '@novu/shared';
import { ExtractDefaultsCommand } from './extract-defaults-command';

export class ExtractDefaultsUsecase {
  /**
   * Executes the use case to extract default values from the JSON Schema.
   * @param command - The command containing the JSON Schema DTO.
   * @returns A nested JSON structure with field paths and their default values.
   */
  execute(command: ExtractDefaultsCommand): Record<string, any> {
    const { jsonSchemaDto } = command;

    return this.extractDefaults(jsonSchemaDto);
  }

  private extractDefaults(schema: JSONSchemaDto): Record<string, any> {
    const result: Record<string, any> = {};

    if (schema.properties) {
      for (const [key, value] of Object.entries(schema.properties)) {
        if (!isJSONSchemaDto(value)) {
          continue;
        }
        const isRequired = schema.required ? schema.required.includes(key) : false;
        if (!isRequired) {
          continue;
        }

        if (value.default !== undefined) {
          result[key] = value.default;
        } else {
          result[key] = 'PREVIEW_ISSUE:REQUIRED_CONTROL_VALUE_IS_MISSING';
        }

        const nestedDefaults = this.extractDefaults(value);
        if (Object.keys(nestedDefaults).length > 0) {
          result[key] = { ...result[key], ...nestedDefaults };
        }
      }
    }

    return result;
  }
}

function isJSONSchemaDto(schema: any): schema is JSONSchemaDto {
  return schema && typeof schema === 'object' && 'type' in schema;
}
