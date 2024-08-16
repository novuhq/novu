export const JSON_SCHEMA_FORM_ID_DELIMITER = '~~~';

export const AUTOCOMPLETE_OPEN_TAG = '{{';
export const AUTOCOMPLETE_CLOSE_TAG = '}}';

export const AUTOCOMPLETE_REGEX = new RegExp(`${AUTOCOMPLETE_OPEN_TAG}(.*?(.*?))${AUTOCOMPLETE_CLOSE_TAG}`, 'm');

export const VALID_VARIABLE_REGEX = new RegExp(`${AUTOCOMPLETE_OPEN_TAG}([^{}]*?)${AUTOCOMPLETE_CLOSE_TAG}`, 'g');

// To get initial invalid syntax of {{..} or {{..<space>
export const INVALID_VARIABLE_REGEX = new RegExp(
  `(${AUTOCOMPLETE_OPEN_TAG}[^{}|\\s]*[}|\\s](?!})|{{[^{}]*}(?!}})|{{[^{}]*$)`,
  'g'
);
