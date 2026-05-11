import { CredentialsKeyEnum } from '@novu/shared';
import { useCallback, useRef, useState } from 'react';
import { type Control, type UseFormSetValue, useWatch } from 'react-hook-form';
import { RiAtLine, RiCheckLine, RiCloseLine, RiInformationLine, RiQrCodeLine, RiSendPlaneLine } from 'react-icons/ri';
import QRCode from 'react-qr-code';
import { Input } from '@/components/primitives/input';
import { Label } from '@/components/primitives/label';
import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
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
  onBotUsernameExtracted?: (username: string) => void;
};

function BotQrPopover({ username }: { username: string }) {
  const url = `https://t.me/${username}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-text-sub border-stroke-soft hover:bg-bg-weak inline-flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors"
        >
          <RiQrCodeLine className="size-3.5 shrink-0" />
          Scan QR to open bot
        </button>
      </PopoverTrigger>
      <PopoverContent className="flex w-auto min-w-0 flex-col items-center gap-3 p-4" side="top" align="start">
        <PopoverArrow />
        <div className="rounded-lg bg-white p-2">
          <QRCode value={url} size={150} />
        </div>
        <p className="text-text-sub text-label-xs text-center leading-4">
          Scan to open <span className="text-text-strong font-medium">@{username}</span> in Telegram
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-text-sub text-label-xs underline underline-offset-2"
        >
          Open in Telegram
        </a>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Smart-paste affordance for the Telegram agent onboarding credentials form.
 *
 * Renders a labeled textarea. When the user pastes (or types) the full
 * BotFather confirmation message, it extracts the HTTP API token and the
 * bot username automatically — no button click needed. The token is written
 * directly into the react-hook-form `apiToken` credential field; the bot
 * username surfaces as a QR / link so the user can immediately open a chat.
 */
export function TelegramCredentialsPaste({ control, setValue, isReadOnly, onBotUsernameExtracted }: TelegramCredentialsPasteProps) {
  const credentials = useWatch({ control, name: 'credentials' });
  const [outcome, setOutcome] = useState<ApplyOutcome | null>(null);
  const [draft, setDraft] = useState('');
  const [manualUsername, setManualUsername] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const notifyUsername = useCallback(
    (username: string) => {
      const cleaned = username.replace(/^@/, '').trim();
      setManualUsername(cleaned);

      if (cleaned) {
        onBotUsernameExtracted?.(cleaned);
      }
    },
    [onBotUsernameExtracted]
  );

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

      if (botUsername) {
        notifyUsername(botUsername);
      }

      return { token, botUsername, recognized: true };
    },
    [credentials, setValue, notifyUsername]
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

  const handleUsernameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      notifyUsername(event.target.value);
    },
    [notifyUsername]
  );

  const dismiss = useCallback(() => setOutcome(null), []);

  if (isReadOnly) return null;

  return (
    <>
      <div className="border-stroke-weak bg-bg-white mb-3 flex flex-col gap-2 overflow-hidden rounded-lg border p-3">
        <Label className="text-label-xs text-text-strong font-medium">BotFather confirmation message</Label>
        <Textarea
          ref={textareaRef}
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

      <div className="mb-3 flex flex-col gap-1.5">
        <Label className="text-label-xs text-text-strong font-medium" htmlFor="telegram-bot-username">
          Bot username
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <Input
          id="telegram-bot-username"
          type="text"
          value={manualUsername}
          onChange={handleUsernameChange}
          placeholder="YourBot_bot"
          leadingIcon={RiAtLine}
          required
        />
        <p className="text-text-soft text-label-xs leading-4">
          Auto-filled from the BotFather message above, or enter it manually.
        </p>
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
