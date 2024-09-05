export const JSON_SCHEMA_FORM_ID_DELIMITER = '~~~';

// Backwards compatibility, for allowing usage of variables without namespace (e.g. `{{name}}` instead of `{{payload.name}}`)
export const PAYLOAD_NAMESPACE = 'payload';

export const AUTOCOMPLETE_OPEN_TAG = '{{';
export const AUTOCOMPLETE_CLOSE_TAG = '}}';

export const LIQUID_FILTER_CHAR = '|';

export const VARIABLE_HTML_TAG_NAME = 'autocomplete-variable';

export const AUTOCOMPLETE_REGEX = new RegExp(`${AUTOCOMPLETE_OPEN_TAG}(.*?(.*?))${AUTOCOMPLETE_CLOSE_TAG}`, 'm');

export const VALID_VARIABLE_REGEX = new RegExp(`${AUTOCOMPLETE_OPEN_TAG}([^{}]*?)${AUTOCOMPLETE_CLOSE_TAG}`, 'g');

// To get initial invalid syntax of {{..} or {{..<space>
export const INVALID_VARIABLE_REGEX = new RegExp(
  `(${AUTOCOMPLETE_OPEN_TAG}[^{}|\\s]*[}|\\s](?!})|{{[^{}]*}(?!}})|{{[^{}]*$)`,
  'g'
);

export const VARIABLE_HTML_ERROR_STATE_REGEX = /data-error="([A-Z_])+"/gi;

export enum VariableErrorCode {
  INVALID_SYNTAX = 'INVALID_SYNTAX',
  INVALID_NAME = 'INVALID_NAME',
}

export const VARIABLE_ERROR_MESSAGES: Record<VariableErrorCode, string> = {
  [VariableErrorCode.INVALID_SYNTAX]: 'Incorrect variable syntax',
  [VariableErrorCode.INVALID_NAME]: 'Invalid variable name',
};
