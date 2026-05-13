import { CredentialsKeyEnum } from '@novu/shared';
import { useCallback, useState } from 'react';
import { type Control, type UseFormSetValue, useWatch } from 'react-hook-form';
import { RiCheckLine, RiCloseLine, RiInformationLine } from 'react-icons/ri';
import { Label } from '@/components/primitives/label';
import { Textarea } from '@/components/primitives/textarea';
import { cn } from '@/utils/ui';
import type { IntegrationFormData } from '../types';

function parseBotFatherMessage(text: string): { token: string | null; botUsername: string | null } {
  const tokenMatch = text.match(/(\d{8,}:[A-Za-z0-9_-]{35,})/);
  const usernameMatch = text.match(/t\.me\/([A-Za-z0-9_]+)/i);

  return {
    token: tokenMatch?.[1] ?? null,
    botUsername: usernameMatch?.[1] ?? null,
  };
}

type ApplyOutcome = { token: string | null; botUsername: string | null; recognized: boolean };

type TelegramCredentialsPasteProps = {
  control: Control<IntegrationFormData>;
  setValue: UseFormSetValue<IntegrationFormData>;
  isReadOnly?: boolean;
};

/**
 * Smart-paste affordance for the Telegram agent onboarding credentials form.
 *
 * Renders a labeled textarea. When the user pastes (or types) the full
 * BotFather confirmation message, it extracts the HTTP API token automatically
 * — no button click needed. The token is written directly into the
 * react-hook-form `apiToken` credential field.
 */
export function TelegramCredentialsPaste({ control, setValue, isReadOnly }: TelegramCredentialsPasteProps) {
  const credentials = useWatch({ control, name: 'credentials' });
  const [outcome, setOutcome] = useState<ApplyOutcome | null>(null);
  const [draft, setDraft] = useState('');

  const apply = useCallback(
    (text: string): ApplyOutcome => {
      const { token, botUsername } = parseBotFatherMessage(text);

      if (!token && !botUsername) {
        return { token: null, botUsername: null, recognized: false };
      }

      if (token && credentials?.apiToken !== token) {
        setValue(`credentials.${CredentialsKeyEnum.ApiToken}`, token, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      }

      return { token, botUsername, recognized: true };
    },
    [credentials, setValue]
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = event.target.value;
      setDraft(text);

      const { token } = parseBotFatherMessage(text);

      if (token) {
        setOutcome(apply(text));
      } else {
        setOutcome(null);
      }
    },
    [apply]
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const text = event.clipboardData.getData('text/plain');
      const { token } = parseBotFatherMessage(text);

      if (!token) return;

      event.preventDefault();
      setDraft('');
      setOutcome(apply(text));
    },
    [apply]
  );

  const dismiss = useCallback(() => setOutcome(null), []);

  if (isReadOnly) return null;

  return (
    <>
      <div className="border-stroke-weak bg-bg-white mb-3 flex flex-col gap-2 overflow-hidden rounded-lg border p-3">
        <Label className="text-label-xs text-text-strong font-medium">BotFather confirmation message</Label>
        <Textarea
          value={draft}
          onChange={handleChange}
          onPaste={handlePaste}
          placeholder={
            'Done! Congratulations on your new bot…\n\nUse this token to access the HTTP API:\n1234567890:AAFdT8_…\n\nYou will find it at t.me/YourBot_bot.'
          }
          rows={5}
          className={cn('font-mono text-xs', outcome?.recognized && 'border-success-base')}
        />
        <p className="text-text-soft text-label-xs leading-4">
          Copy the full confirmation message from BotFather and paste it here — the token is set automatically.
        </p>

        {outcome && (
          <PasteOutcome outcome={outcome} onDismiss={dismiss} />
        )}
      </div>
    </>
  );
}

function PasteOutcome({ outcome, onDismiss }: { outcome: ApplyOutcome; onDismiss: () => void }) {
  if (!outcome.recognized) {
    return (
      <div className="border-stroke-weak bg-bg-white flex items-start gap-2 rounded-md border p-2">
        <span className="text-warning-base mt-0.5">
          <RiInformationLine className="size-4" />
        </span>
        <div className="flex flex-1 flex-col gap-0.5">
          <p className="text-text-strong text-label-xs font-medium">Couldn't find a bot token in the pasted text.</p>
          <p className="text-text-soft text-label-xs leading-4">Paste the full message from BotFather, or enter the token manually in the field below.</p>
        </div>
        <button type="button" className="text-text-soft hover:text-text-strong cursor-pointer" aria-label="Dismiss" onClick={onDismiss}>
          <RiCloseLine className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="border-stroke-weak bg-bg-white flex items-start gap-2 rounded-md border p-2">
      <span className="text-success-base mt-0.5">
        <RiCheckLine className="size-4" />
      </span>
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="text-text-strong text-label-xs font-medium">
          {outcome.token ? 'Bot token set.' : 'Token not found — fill it manually below.'}
        </p>
        {outcome.botUsername && (
          <p className="text-text-soft text-label-xs leading-4">
            Bot username set to{' '}
            <span className="text-text-strong font-medium">@{outcome.botUsername}</span>
          </p>
        )}
      </div>
      <button type="button" className="text-text-soft hover:text-text-strong cursor-pointer" aria-label="Dismiss" onClick={onDismiss}>
        <RiCloseLine className="size-3.5" />
      </button>
    </div>
  );
}
