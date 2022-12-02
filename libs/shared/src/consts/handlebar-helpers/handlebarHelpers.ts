export enum HandlebarHelpersEnum {
  EQUALS = 'equals',
  TITLECASE = 'titlecase',
  UPPERCASE = 'uppercase',
  LOWERCASE = 'lowercase',
  PLURALIZE = 'pluralize',
  DATEFORMAT = 'dateFormat',
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export const HandlebarHelpers = {
  [HandlebarHelpersEnum.EQUALS]: { description: 'assert equal' },
  [HandlebarHelpersEnum.TITLECASE]: { description: 'transform to titlecase' },
  [HandlebarHelpersEnum.UPPERCASE]: { description: 'transform to uppercase' },
  [HandlebarHelpersEnum.LOWERCASE]: { description: 'transform to lowercase' },
  [HandlebarHelpersEnum.PLURALIZE]: { description: 'check if needed and pluralize' },
  [HandlebarHelpersEnum.DATEFORMAT]: { description: 'format date' },
};
