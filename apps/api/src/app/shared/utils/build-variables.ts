import { PinoLogger } from '@novu/application-generic';
import { AdditionalOperation, RulesLogic } from 'json-logic-js';
import { JSONSchemaDto } from '../dtos/json-schema.dto';
import { isStringifiedMailyJSONContent, wrapMailyInLiquid } from '../helpers/maily-utils';
import { extractFieldsFromRules, isValidRule } from '../services/query-parser/query-parser.service';
import { extractLiquidTemplateVariables as newExtractLiquidTemplateVariables } from './template-parser/new-liquid-parser';
import type { VariableDetails } from './template-parser/types';

export function buildVariables({
  variableSchema,
  controlValue,
  logger,
  suggestPayloadNamespace = true,
}: {
  variableSchema: JSONSchemaDto | undefined;
  controlValue: unknown | Record<string, unknown>;
  logger?: PinoLogger;
  suggestPayloadNamespace?: boolean;
}): VariableDetails {
  let variableControlValue = controlValue;

  if (isStringifiedMailyJSONContent(variableControlValue)) {
    try {
      variableControlValue = wrapMailyInLiquid(variableControlValue);
    } catch (error) {
      logger?.error(
        {
          err: error as Error,
          controlKey: 'unknown',
          message: 'Failed to transform maily content to liquid syntax',
        },
        'BuildVariables'
      );
    }
  } else if (isValidRule(variableControlValue as RulesLogic<AdditionalOperation>)) {
    const fields = extractFieldsFromRules(variableControlValue as RulesLogic<AdditionalOperation>)
      .filter((field) => field.startsWith('payload.') || field.startsWith('subscriber.data.'))
      .map((field) => `{{${field}}}`);

    variableControlValue = {
      rules: variableControlValue,
      fields,
    };
  }

  const { validVariables, invalidVariables } = newExtractLiquidTemplateVariables({
    template: typeof variableControlValue === 'string' ? variableControlValue : JSON.stringify(variableControlValue),
    variableSchema,
    suggestPayloadNamespace,
  });

  return {
    validVariables,
    invalidVariables,
  };
}
