import { JsonSchemaFormSectionVariant } from '../../styled-system/recipes';
import {
  AUTOCOMPLETE_CLOSE_TAG,
  AUTOCOMPLETE_OPEN_TAG,
  INVALID_VARIABLE_REGEX,
  JSON_SCHEMA_FORM_ID_DELIMITER,
  VALID_VARIABLE_REGEX,
  VariableErrorCode,
  VARIABLE_HTML_ERROR_STATE_REGEX,
  VARIABLE_HTML_TAG_NAME,
  PAYLOAD_NAMESPACE,
} from './constants';

/** determine the tree depth of a JsonSchemaForm section with the given sectionId */
export function calculateSectionDepth({ sectionId }: { sectionId: string }): number {
  return sectionId.split(JSON_SCHEMA_FORM_ID_DELIMITER).length - 1;
}

export function getVariantFromDepth(depth: number): JsonSchemaFormSectionVariant['depth'] {
  return depth % 2 === 0 ? 'even' : 'odd';
}

export const cleanVariableMatch = (variableMatch?: string): string => {
  if (!variableMatch) {
    return '';
  }

  return variableMatch.replace(AUTOCOMPLETE_OPEN_TAG, '').replace(AUTOCOMPLETE_CLOSE_TAG, '').split('|')[0].trim();
};

const VARIABLE_ERROR_CODE_SET = new Set(Object.values(VariableErrorCode));
export const checkIsValidVariableErrorCode = (input?: string) => {
  if (!input) {
    return false;
  }

  return VARIABLE_ERROR_CODE_SET.has(input as VariableErrorCode);
};

export const getInitContentWithVariableNodeView = (inputString: string, variablesSet: Set<string>) => {
  if (!inputString) {
    return inputString;
  }

  let result = inputString.toString().replace(VALID_VARIABLE_REGEX, (match, validContent) => {
    const cleanedMatch = cleanVariableMatch(match);
    const isValidVariable = variablesSet.has(cleanedMatch);

    return `<${VARIABLE_HTML_TAG_NAME} data-label="${validContent}" data-id="${validContent}" ${
      !isValidVariable ? `data-error="${VariableErrorCode.INVALID_NAME}"` : ''
    }></${VARIABLE_HTML_TAG_NAME}>`;
  });

  result = result?.replace(INVALID_VARIABLE_REGEX, (match) => {
    return `<${VARIABLE_HTML_TAG_NAME} data-label="${match}" data-id="${match}" data-error="${VariableErrorCode.INVALID_SYNTAX}"></${VARIABLE_HTML_TAG_NAME}>`;
  });

  return result;
};

/** Parse editor HTML and extract valid error codes from variable references (if any) */
export const extractErrorCodesFromHtmlContent = (htmlContent?: string): Set<string> | undefined => {
  if (!htmlContent) {
    return;
  }

  const errorCodes = htmlContent
    .match(VARIABLE_HTML_ERROR_STATE_REGEX)
    ?.map((str) => str.match(/"(.*?)"/i)?.[0]?.replaceAll('"', ''))
    ?.filter((code) => checkIsValidVariableErrorCode(code));

  return errorCodes ? new Set(errorCodes) : undefined;
};

// Backwards compatibility, for allowing usage of variables without namespace (e.g. `{{name}}` instead of `{{payload.name}}`)
export const getDeprecatedPayloadVariables = (variables: string[]): string[] => {
  return variables
    .filter((variable: string) => variable.startsWith(`${PAYLOAD_NAMESPACE}.`))
    .map(getVariableWithoutNamespace);
};

export const getVariableWithoutNamespace = (variableName: string): string => {
  return variableName.split('.').splice(1).join('.');
};
