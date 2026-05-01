import { type ClipboardEvent, useCallback } from 'react';
import { type Control, type UseFormSetValue, useWatch } from 'react-hook-form';
import type { IntegrationFormData } from '../types';
import { isLikelySlackCredentialsBlock, parseSlackCredentialsBlock } from './parse-slack-credentials-block';

/**
 * Returns a paste handler suitable for spreading on the wrapper of the
 * credentials form fields. When the pasted text looks like a Slack
 * credentials block, it intercepts and routes through the parser instead of
 * letting the value land in whichever field the user happened to focus.
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
      if (parsed.matched.length === 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      for (const key of parsed.matched) {
        const value = parsed.values[key];
        if (value === undefined || credentials?.[key] === value) continue;

        setValue(`credentials.${key}`, value, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      }
    },
    [credentials, isEnabled, setValue]
  );
}
