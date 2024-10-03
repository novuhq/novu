/* eslint-disable */
import { Injectable } from '@nestjs/common/decorators';
import { ControlPreviewIssue, ControlPreviewIssueType, JSONSchemaDto, ValidationStrategyEnum } from '@novu/shared';

// Define the command interface
interface VariableValidatorCommand {
  validationStrategies: ValidationStrategyEnum[];
  controlSchema: JSONSchemaDto;
  payload?: Record<string, unknown>;
  controlsValues?: Record<string, unknown>;
}

@Injectable()
export class VariableValidatorUseCase {
  execute(command: VariableValidatorCommand): Record<string, ControlPreviewIssue[]> {
    const { validationStrategies, controlSchema, payload, controlsValues } = command;
    let issues: Record<string, ControlPreviewIssue[]> = {};

    if (validationStrategies.includes(ValidationStrategyEnum.VALIDATE_MISSING_PAYLOAD_VALUES_FOR_HYDRATION)) {
      const placeholders = this.collectPlaceholders(controlsValues);
      issues = { ...this.validatePlaceholders(placeholders, payload), ...issues };
    }
    if (validationStrategies.includes(ValidationStrategyEnum.VALIDATE_MISSING_CONTROL_VALUES)) {
      issues = { ...this.validateMissingControlValues(controlSchema, controlsValues), ...issues };
    }

    return issues;
  }

  private validateMissingControlValues(controlSchema: JSONSchemaDto, controlsValues?: Record<string, unknown>) {
    let issues: Record<string, ControlPreviewIssue[]> = {};

    const requiredFields = findRequiredFields(controlSchema);
    const keysWithValues = controlsValues ? Object.keys(controlsValues) : [];

    requiredFields.forEach((field) => {
      if (!keysWithValues.includes(field)) {
        issues[field] = issues[field] || [];
        issues[field].push({
          issueType: ControlPreviewIssueType.MISSING_VALUE,
          message: `The control value for '${field}' is missing.`,
        });
      }
    });
    return issues;
  }

  /**
   * Validates the placeholders against the original object and returns an object of issues.
   *
   * @param {Record<string, string>} placeholders - The object mapping placeholders to their original keys.
   * @param {any} originalObj - The original object to validate against.
   * @returns {Record<string, ControlPreviewIssue[]>} An object mapping original values to an array of issues.
   */
  private validatePlaceholders(
    placeholders: Record<string, string>,
    originalObj: any
  ): Record<string, ControlPreviewIssue[]> {
    const issues: Record<string, ControlPreviewIssue[]> = {};

    for (const placeholder in placeholders) {
      const originalKey = placeholders[placeholder];
      const originalValue = this.getValueByPath(originalObj, originalKey);

      if (originalValue === undefined) {
        issues[originalKey] = issues[originalKey] || [];
        issues[originalKey].push({
          issueType: ControlPreviewIssueType.MISSING_VARIABLE_IN_PAYLOAD,
          variableName: placeholder,
          message: `The variable '${placeholder}' is missing in the payload.`,
        });
      } else if (typeof originalValue !== 'string') {
        issues[originalKey] = issues[originalKey] || [];
        issues[originalKey].push({
          issueType: ControlPreviewIssueType.VARIABLE_TYPE_MISMATCH,
          variableName: placeholder,
          message: `The variable '${placeholder}' is expected to be a string, but got ${typeof originalValue}.`,
        });
      }
    }

    return issues;
  }

  /**
   * Retrieves the value from an object by a dot-separated path.
   *
   * @param {any} obj - The object to retrieve the value from.
   * @param {string} path - The dot-separated path to the value.
   * @returns {any} The value at the specified path, or undefined if not found.
   */
  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  /**
   * Collects placeholders from the provided object and returns an object
   * where each key is a placeholder and its value is the original key
   * from which the placeholder was found.
   *
   * @param {any} obj - The input object containing strings with placeholders.
   * @returns {Record<string, string>} An object mapping placeholders to their original keys.
   */
  private collectPlaceholders(obj: any): Record<string, string> {
    const placeholders: Record<string, string> = {};

    function recursiveSearch(value: any, originalKey: string | null = null) {
      if (typeof value === 'string') {
        const regex = /{{(.*?)}}/g;
        let match;

        while ((match = regex.exec(value)) !== null) {
          const placeholder = match[1].trim();
          placeholders[placeholder] = originalKey || '';
        }
      } else if (Array.isArray(value)) {
        for (const item of value) {
          recursiveSearch(item, originalKey);
        }
      } else if (typeof value === 'object' && value !== null) {
        for (const key in value) {
          if (value.hasOwnProperty(key)) {
            recursiveSearch(value[key], key);
          }
        }
      }
    }

    recursiveSearch(obj);

    return placeholders;
  }
}

function findRequiredFields(schema: JSONSchemaDto, parentPath: string = ''): string[] {
  const requiredFields: string[] = [];

  // Check if the schema has a 'required' key
  if (schema.required) {
    // Construct the path for each required field
    schema.required.forEach((field) => {
      requiredFields.push(parentPath ? `${parentPath}.${field}` : field);
    });
  }

  // If the schema has properties, check each property
  if (schema.properties) {
    for (const prop in schema.properties) {
      const propSchema: JSONSchemaDto | boolean = schema.properties[prop];
      // Construct the path for the current property
      const currentPath = parentPath ? `${parentPath}.${prop}` : prop;

      // Recursively find required fields in nested objects
      if (isJSONSchemaDto(propSchema) && propSchema.type === 'object') {
        const nestedRequired = findRequiredFields(propSchema, currentPath);
        requiredFields.push(...nestedRequired);
      }
    }
  }

  return requiredFields;
}

function isJSONSchemaDto(schema: any): schema is JSONSchemaDto {
  return schema && typeof schema === 'object' && 'type' in schema;
}
