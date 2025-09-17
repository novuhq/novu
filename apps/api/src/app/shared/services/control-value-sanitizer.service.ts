import { Injectable } from '@nestjs/common';
import {
  dashboardSanitizeControlValues,
  layoutControlSchema,
  PinoLogger,
  SanitizationType,
} from '@novu/application-generic';
import { actionStepSchemas, channelStepSchemas } from '@novu/framework/internal';
import { ResourceOriginEnum } from '@novu/shared';
import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { cloneDeep, get, merge, set } from 'es-toolkit/compat';
import { previewControlValueDefault } from '../../workflows-v2/usecases/preview/preview.constants';
import { ControlValueProcessingResult, PreviewTemplateData } from '../../workflows-v2/usecases/preview/preview.types';
import { replaceAll } from '../../workflows-v2/usecases/preview/utils/variable-helpers';
import { JSONSchemaDto } from '../dtos/json-schema.dto';
import { isObjectMailyJSONContent, isStringifiedMailyJSONContent, replaceMailyVariables } from '../helpers/maily-utils';
import { buildVariables } from '../utils/build-variables';
import { buildLiquidParser } from '../utils/template-parser/liquid-engine';
import type { Variable } from '../utils/template-parser/types';

@Injectable()
export class ControlValueSanitizerService {
  constructor(private readonly logger: PinoLogger) {}

  sanitizeControlsForPreview(
    initialControlValues: Record<string, unknown>,
    type: SanitizationType,
    resourceOrigin: ResourceOriginEnum
  ): Record<string, unknown> {
    if (resourceOrigin !== ResourceOriginEnum.NOVU_CLOUD) {
      return initialControlValues;
    }

    const sanitizedValues = dashboardSanitizeControlValues(this.logger, initialControlValues, type);
    const sanitizedByOutputSchema = this.sanitizeControlValuesByOutputSchema(sanitizedValues || {}, type);

    if (!sanitizedByOutputSchema) {
      throw new Error(
        'Control values normalization failed, normalizeControlValues function requires maintenance to sanitize the provided type or data structure correctly'
      );
    }

    return sanitizedByOutputSchema;
  }

  processControlValues(
    controlValues: Record<string, unknown>,
    variableSchema: JSONSchemaDto,
    variablesObject: Record<string, unknown>
  ): ControlValueProcessingResult {
    let previewTemplateData: PreviewTemplateData = {
      payloadExample: {},
      controlValues: {},
    };

    const sanitizedControls: Record<string, unknown> = {};

    for (const [controlKey, controlValue] of Object.entries(controlValues || {})) {
      const variables = buildVariables({
        variableSchema,
        controlValue,
        logger: this.logger,
      });

      const controlValueWithFixedVariables = this.fixControlValueInvalidVariables(
        controlValue,
        variables.invalidVariables
      );

      const processedControlValues = this.sanitizeControlValuesByLiquidCompilationFailure(
        controlKey,
        controlValueWithFixedVariables
      );

      sanitizedControls[controlKey] = processedControlValues;

      previewTemplateData = {
        payloadExample: merge(previewTemplateData.payloadExample, variablesObject),
        controlValues: {
          ...previewTemplateData.controlValues,
          [controlKey]: isObjectMailyJSONContent(processedControlValues)
            ? JSON.stringify(processedControlValues)
            : processedControlValues,
        },
      };
    }

    return { sanitizedControls, previewTemplateData };
  }

  private sanitizeControlValuesByOutputSchema(
    controlValues: Record<string, unknown>,
    type: SanitizationType
  ): Record<string, unknown> {
    let outputSchema = channelStepSchemas[type]?.output || actionStepSchemas[type]?.output;
    if (type === 'layout') {
      outputSchema = layoutControlSchema;
    }

    if (!outputSchema || !controlValues) {
      return controlValues;
    }

    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(outputSchema);
    const isValid = validate(controlValues);
    const errors = validate.errors as null | ErrorObject[];

    if (isValid || !errors || errors?.length === 0) {
      return controlValues;
    }

    return this.replaceInvalidControlValues(controlValues, errors);
  }

  private replaceInvalidControlValues(
    normalizedControlValues: Record<string, unknown>,
    errors: ErrorObject[]
  ): Record<string, unknown> {
    const fixedValues = cloneDeep(normalizedControlValues);

    for (const error of errors) {
      if (error.keyword === 'additionalProperties') {
        continue;
      }

      const path = this.getErrorPath(error);
      const defaultValue = get(previewControlValueDefault, path);
      set(fixedValues, path, defaultValue);
    }

    return fixedValues;
  }

  private getErrorPath(error: ErrorObject): string {
    return (error.instancePath.substring(1) || error.params.missingProperty)?.replace(/\//g, '.');
  }

  private fixControlValueInvalidVariables(controlValue: unknown, invalidVariables: Variable[]): unknown {
    try {
      const EMPTY_STRING = '';
      const isMailyJSONContent = isStringifiedMailyJSONContent(controlValue);
      let controlValuesString = isMailyJSONContent ? controlValue : JSON.stringify(controlValue);

      for (const invalidVariable of invalidVariables) {
        let variableOutput = invalidVariable.output;

        if (isMailyJSONContent) {
          variableOutput = variableOutput.replace(/\{\{|\}\}/g, '').trim();
          controlValuesString = JSON.stringify(
            replaceMailyVariables(controlValuesString, variableOutput, EMPTY_STRING)
          );
          continue;
        }

        if (!controlValuesString.includes(variableOutput)) {
          continue;
        }

        controlValuesString = replaceAll(controlValuesString, variableOutput, EMPTY_STRING);
      }

      return JSON.parse(controlValuesString);
    } catch (error) {
      return controlValue;
    }
  }

  private sanitizeControlValuesByLiquidCompilationFailure(key: string, value: unknown): unknown {
    const parserEngine = buildLiquidParser();

    try {
      parserEngine.parse(JSON.stringify(value));

      return value;
    } catch (error) {
      return get(previewControlValueDefault, key);
    }
  }
}
