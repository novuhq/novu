import { CredentialsKeyEnum } from '@novu/shared';
import { type ClipboardEvent, type ReactNode, useState } from 'react';
import type { UseFormSetValue } from 'react-hook-form';
import { RiInformationFill } from 'react-icons/ri';
import { SetupButton, SetupStep, SetupStepperRail } from '@/components/agents/setup-guide-primitives';
import type { IntegrationFormData } from '../types';
import {
  isLikelyResendCredentialsBlock,
  parseResendCredentials,
  type ResendCredentialField,
} from './parse-resend-credentials';

const RESEND_API_KEYS_URL = 'https://resend.com/api-keys';

const FIELD_LABELS: Record<ResendCredentialField, string> = {
  [CredentialsKeyEnum.ApiKey]: 'API Key',
  [CredentialsKeyEnum.From]: 'From email address',
  [CredentialsKeyEnum.SenderName]: 'Sender name',
};
const FIELD_ORDER = Object.keys(FIELD_LABELS) as ResendCredentialField[];

function formatList(items: string[]): string {
  if (items.length <= 1) return items.join('');

  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

type ResendSetupProps = {
  /** The API key, from address and sender name fields. */
  credentialFields: ReactNode;
  setValue: UseFormSetValue<IntegrationFormData>;
  isReadOnly?: boolean;
};

/**
 * Setup for Resend: create an API key for Novu, then fill in the key and the sender. Pasting a block of
 * environment variables into any of the fields fills in everything Novu finds in it.
 */
export function ResendSetup({ credentialFields, setValue, isReadOnly }: ResendSetupProps) {
  const [foundFields, setFoundFields] = useState<ResendCredentialField[]>([]);

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (isReadOnly) return;

    const text = event.clipboardData.getData('text/plain');
    if (!isLikelyResendCredentialsBlock(text)) return;

    const parsed = parseResendCredentials(text);
    const found = FIELD_ORDER.filter((key) => parsed[key] !== undefined);
    if (found.length === 0) return;

    // Keeps the whole block out of the field that happened to have focus.
    event.preventDefault();
    event.stopPropagation();

    for (const key of found) {
      const value = parsed[key];
      if (value === undefined) continue;
      setValue(`credentials.${key}`, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    }
    setFoundFields(found);
  };

  return (
    <SetupStepperRail className="-ml-3 pb-4">
      <SetupStep
        index={1}
        status="current"
        title="Create an API key in Resend"
        description="Create a key just for Novu, so you can revoke it on its own. Sending access is enough. Send from a domain you’ve verified in Resend."
        extraContent={<SetupButton href={RESEND_API_KEYS_URL}>Open Resend API keys</SetupButton>}
      />
      <SetupStep
        index={2}
        status="current"
        title="Add your credentials"
        description="Fill in the key and the sender. Have them in a .env file already? Paste the lines into any field and Novu fills in the rest."
        extraContent={
          <div className="flex flex-col gap-2" onPasteCapture={handlePaste}>
            {credentialFields}
            {foundFields.length > 0 && (
              <p className="text-paragraph-xs text-text-sub flex items-center gap-1" aria-live="polite">
                <RiInformationFill className="text-text-soft size-4 shrink-0" />
                Found {formatList(foundFields.map((key) => FIELD_LABELS[key]))}
              </p>
            )}
          </div>
        }
      />
    </SetupStepperRail>
  );
}
