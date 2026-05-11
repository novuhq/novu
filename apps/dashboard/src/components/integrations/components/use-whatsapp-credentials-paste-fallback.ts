import { CredentialsKeyEnum } from '@novu/shared';
import { type ClipboardEvent, useCallback } from 'react';
import { type Control, type UseFormSetValue, useWatch } from 'react-hook-form';
import { showSuccessToast, showWarningToast } from '@/components/primitives/sonner-helpers';
import type { IntegrationFormData } from '../types';
import {
  getWhatsAppFieldDisplayName,
  isLikelyWhatsAppCredentialsBlock,
  parseWhatsAppCredentialsBlock,
  type WhatsAppCredentialField,
} from './parse-whatsapp-credentials-block';

const WHATSAPP_FIELD_COUNT = 4;

const API_SETUP_FIELDS: WhatsAppCredentialField[] = [
  CredentialsKeyEnum.ApiToken,
  CredentialsKeyEnum.phoneNumberIdentification,
  CredentialsKeyEnum.businessAccountId,
];

function describeFollowUp(filled: WhatsAppCredentialField[]): string {
  const filledSecret = filled.includes(CredentialsKeyEnum.SecretKey);
  const missingApiSetup = API_SETUP_FIELDS.filter((key) => !filled.includes(key));

  if (filledSecret && missingApiSetup.length > 0) {
    return 'Now copy the API Setup page in Meta to grab the Access Token, Phone Number ID and WhatsApp Business Account ID.';
  }

  if (!filledSecret) {
    return 'App Secret lives on a different page (App settings > Basic) — paste it manually below.';
  }

  return 'You can save your credentials and move on to the next step.';
}

function formatList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;

  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/**
 * Returns a paste handler suitable for spreading on the wrapper of the
 * credentials form fields. When the pasted text looks like a WhatsApp
 * credentials block (Meta API Setup page), it intercepts and routes through
 * the parser instead of letting the value land in whichever field happened to
 * be focused.
 */
export function useWhatsAppCredentialsPasteFallback({
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
      if (!isLikelyWhatsAppCredentialsBlock(text)) {
        return;
      }

      const parsed = parseWhatsAppCredentialsBlock(text);
      if (parsed.matched.length === 0 && parsed.masked.length === 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const filled: WhatsAppCredentialField[] = [];
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
        const maskedNames = parsed.masked.map(getWhatsAppFieldDisplayName);
        const isSingular = maskedNames.length === 1;
        const headline =
          filled.length > 0
            ? `Filled ${filled.length} of ${WHATSAPP_FIELD_COUNT} fields — ${formatList(maskedNames)} still hidden behind dots.`
            : `${formatList(maskedNames)} ${isSingular ? 'is' : 'are'} still hidden behind dots in Meta.`;

        showWarningToast(
          `In Meta, click Show next to ${formatList(maskedNames)} to reveal ${isSingular ? 'it' : 'them'}, then paste again.`,
          headline
        );

        return;
      }

      if (filled.length > 0) {
        const headline = `Filled ${filled.length} of ${WHATSAPP_FIELD_COUNT} fields from your WhatsApp credentials.`;
        showSuccessToast(describeFollowUp(filled), headline);
      }
    },
    [credentials, isEnabled, setValue]
  );
}
