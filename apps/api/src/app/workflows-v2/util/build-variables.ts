import { PinoLogger } from '@novu/application-generic';
import { AdditionalOperation, RulesLogic } from 'json-logic-js';

import { extractFieldsFromRules, isValidRule } from '../../shared/services/query-parser/query-parser.service';
import { JSONSchemaDto } from '../../shared/dtos/json-schema.dto';
import { extractLiquidTemplateVariables } from './template-parser/liquid-parser';
import { extractLiquidTemplateVariables as newExtractLiquidTemplateVariables } from './template-parser/new-liquid-parser';
import type { VariableDetails } from './template-parser/types';
import { isStringifiedMailyJSONContent, wrapMailyInLiquid } from '../../shared/helpers/maily-utils';

export function buildVariables({
  useNewLiquidParser,
  variableSchema,
  controlValue,
  logger,
}: {
  useNewLiquidParser: boolean;
  variableSchema: JSONSchemaDto | undefined;
  controlValue: unknown | Record<string, unknown>;
  logger?: PinoLogger;
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

  if (useNewLiquidParser) {
    const { validVariables, invalidVariables } = newExtractLiquidTemplateVariables({
      template: typeof variableControlValue === 'string' ? variableControlValue : JSON.stringify(variableControlValue),
      variableSchema,
    });

    return {
      validVariables,
      invalidVariables,
    };
  }

  const { validVariables, invalidVariables } = extractLiquidTemplateVariables({
    template: typeof variableControlValue === 'string' ? variableControlValue : JSON.stringify(variableControlValue),
    variableSchema,
  });

  return {
    validVariables,
    invalidVariables,
  };
}
