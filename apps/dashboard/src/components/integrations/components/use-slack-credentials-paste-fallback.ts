import { type ClipboardEvent, useCallback } from 'react';
import { type Control, type UseFormSetValue, useWatch } from 'react-hook-form';
import { showSuccessToast, showWarningToast } from '@/components/primitives/sonner-helpers';
import type { IntegrationFormData } from '../types';
import {
  getSlackFieldDisplayName,
  isLikelySlackCredentialsBlock,
  parseSlackCredentialsBlock,
  type SlackCredentialField,
} from './parse-slack-credentials-block';

const SLACK_FIELD_COUNT = 4;

function formatList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;

  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/**
 * Returns a paste handler suitable for spreading on the wrapper of the
 * credentials form fields. When the pasted text looks like a Slack
 * credentials block, it intercepts and routes through the parser instead of
 * letting the value land in whichever field the user happened to focus.
 *
 * Surfaces a toast so the user knows what got filled — and, importantly, when
 * Slack secrets were still masked behind dots and need to be revealed before
 * pasting again.
 */
export function useSlackCredentialsPasteFallback({
  setValue,
  control,
  isEnabled,
}: {
  setValue: UseFormSetValue<IntegrationFormData>;
  control: Control<IntegrationFormData>;
  isEnabled: boolean;
}) {
  const credentials = useWatch({ control, name: 'credentials' });

  return useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      if (!isEnabled) return;

      const text = event.clipboardData.getData('text/plain');
      if (!isLikelySlackCredentialsBlock(text)) {
        return;
      }

      const parsed = parseSlackCredentialsBlock(text);
      if (parsed.matched.length === 0 && parsed.masked.length === 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const filled: SlackCredentialField[] = [];
      for (const key of parsed.matched) {
        const value = parsed.values[key];
        if (value === undefined) continue;
        if (credentials?.[key] === value) {
          filled.push(key);
          continue;
        }

        setValue(`credentials.${key}`, value, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
        filled.push(key);
      }

      if (parsed.masked.length > 0) {
        const maskedNames = parsed.masked.map(getSlackFieldDisplayName);
        const isSingular = maskedNames.length === 1;
        const headline =
          filled.length > 0
            ? `Filled ${filled.length} of ${SLACK_FIELD_COUNT} fields — ${formatList(maskedNames)} still hidden behind dots.`
            : `${formatList(maskedNames)} ${isSingular ? 'is' : 'are'} still hidden behind dots in Slack.`;

        showWarningToast(
          `In Slack, click Show next to ${formatList(maskedNames)} to reveal ${
            isSingular ? 'it' : 'them'
          }, then paste again.`,
          headline
        );

        return;
      }

      if (filled.length > 0) {
        showSuccessToast(`Filled ${filled.length} of ${SLACK_FIELD_COUNT} fields from your Slack credentials block.`);
      }
    },
    [credentials, isEnabled, setValue]
  );
}
