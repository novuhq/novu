import { JsonSchemaFormSectionVariant } from '../../styled-system/recipes';
import {
  AUTOCOMPLETE_CLOSE_TAG,
  AUTOCOMPLETE_OPEN_TAG,
  JSON_SCHEMA_FORM_ID_DELIMITER,
  VariableErrorCode,
  VARIABLE_HTML_ERROR_STATE_REGEX,
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

  return variableMatch.replace(AUTOCOMPLETE_OPEN_TAG, '').replace(AUTOCOMPLETE_CLOSE_TAG, '');
};

const VARIABLE_ERROR_CODE_SET = new Set(Object.values(VariableErrorCode));
export const checkIsValidVariableErrorCode = (input?: string) => {
  if (!input) {
    return false;
  }

  return VARIABLE_ERROR_CODE_SET.has(input as VariableErrorCode);
};

/** Parse editor HTML and extract valid error codes from variable references (if any) */
export const extractErrorCodesFromHtmlContent = (htmlContent?: string) => {
  if (!htmlContent) {
    return;
  }

  return htmlContent
    .match(VARIABLE_HTML_ERROR_STATE_REGEX)
    ?.map((str) => str.match(/\"(.*)\"/i)?.[0]?.replaceAll('"', ''))
    ?.filter((code) => checkIsValidVariableErrorCode(code));
};
