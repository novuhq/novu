import { JSONContent as MailyJSONContent } from '@maily-to/render';

export const LOG_CONTEXT = 'GeneratePreviewUsecase';

const EMPTY_STRING = '';
const WHITESPACE = ' ';
const DEFAULT_URL_TARGET = '_blank';
const DEFAULT_URL_PATH = 'https://www.redirect-example.com';
const DEFAULT_TIP_TAP_EMPTY_PREVIEW: MailyJSONContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      attrs: {
        textAlign: 'left',
      },
      content: [
        {
          type: 'text',
          text: EMPTY_STRING,
        },
      ],
    },
  ],
};

/**
 * Default control values used specifically for preview purposes.
 * These values are designed to be parsable by Liquid.js and provide
 * safe fallback values when generating preview.
 */
export const previewControlValueDefault = {
  subject: EMPTY_STRING,
  body: WHITESPACE,
  avatar: DEFAULT_URL_PATH,
  emailEditor: DEFAULT_TIP_TAP_EMPTY_PREVIEW,
  data: {},
  'primaryAction.label': EMPTY_STRING,
  'primaryAction.redirect.url': DEFAULT_URL_PATH,
  'primaryAction.redirect.target': DEFAULT_URL_TARGET,
  'secondaryAction.label': EMPTY_STRING,
  'secondaryAction.redirect.url': DEFAULT_URL_PATH,
  'secondaryAction.redirect.target': DEFAULT_URL_TARGET,
  'redirect.url': DEFAULT_URL_PATH,
  'redirect.target': DEFAULT_URL_TARGET,
} as const;
