import { loadLanguage } from '@uiw/codemirror-extensions-langs';

export const JSON_EDITOR_CONFIG = {
  extensions: [loadLanguage('json')?.extension ?? []],
  basicSetup: { lineNumbers: true, defaultKeymap: true },
};

export const DRAWER_CLASSES = {
  content: 'bg-bg-weak flex w-[600px] flex-col p-0 sm:max-w-3xl',
  headerTitle: 'text-label-lg',
  headerDescription: 'text-paragraph-xs mt-0',
  badge: 'text-label-xs relative bottom-[1px]',
  schemaTitle: 'text-label-xs w-full',
  validationContainer:
    'rounded-4 border-1 mb-2 flex items-center justify-between border border-neutral-100 bg-white p-1.5',
  validationText: 'text-text-strong text-label-xs flex items-center gap-1',
  validationIcon: 'text-text-strong size-3',
  infoIcon: 'size-3 text-neutral-400',
  hint: 'text-text-soft p-2 px-3',
  footer: 'border-neutral-content-weak space-between flex border-t px-3 py-1.5',
  footerButtonContainer: 'flex w-full flex-row items-center justify-between gap-2',
};

export const EMPTY_STATE_CLASSES = {
  container:
    'flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50 bg-white p-4 text-center',
  titleContainer: 'mb-6 space-y-2',
  title: 'text-text-sub text-label-xs',
  description: 'text-text-soft text-paragraph-xs max-w-md',
  code: 'rounded bg-neutral-100 px-1 py-0.5 text-xs',
  buttonContainer: 'flex flex-col gap-2',
  buttonWrapper: 'flex flex-row items-center justify-center',
  linkButton: 'text-label-xs',
};

export const IMPORT_EDITOR_CLASSES = {
  container: 'flex h-full flex-col',
  header: 'mb-2 flex flex-row items-center justify-between gap-2',
  title: 'text-label-xs w-full',
  editor: 'h-full min-h-[200px] overflow-auto rounded-lg border border-neutral-200 bg-white',
  footer: 'flex items-center justify-between pt-1',
  infoContainer: 'flex items-center gap-2 text-xs text-neutral-500',
  infoIcon: 'size-3',
};

export const PLACEHOLDER_JSON = JSON.stringify({ example: 'Paste your payload JSON here' }, null, 2);

export const INFO_MESSAGES = {
  payloadFound: 'Using data from the most recent workflow trigger.',
  payloadNotFound: 'No recent payload found. Please paste your JSON above.',
  loadingActivity: 'Loading recent payloads...',
  loadingSubtext: 'Fetching from activity feed',
};

export const ERROR_MESSAGES = {
  fetchFailed: 'Failed to fetch recent payloads. Please try again.',
  invalidJson: 'Invalid JSON format. Please check your payload.',
  generateFailed: 'Failed to generate schema. Please try again.',
};

export const SUCCESS_MESSAGES = {
  schemaGenerated: 'Schema generated successfully!',
};
