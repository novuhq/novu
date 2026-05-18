import { CredentialsKeyEnum } from '@novu/shared';
import { useCallback, useState } from 'react';
import { type Control, type UseFormSetValue, useWatch } from 'react-hook-form';
import { RiCheckLine, RiCloseLine, RiInformationLine } from 'react-icons/ri';
import {
  AgentTelegramMobileSetupCard,
  IntegrationStoreTelegramMobileSetupCard,
} from '@/components/agents/telegram-mobile-setup-card';
import { Label } from '@/components/primitives/label';
import { Textarea } from '@/components/primitives/textarea';
import { parseBotFatherMessage } from '@/utils/telegram-bot-token';
import { cn } from '@/utils/ui';
import type { IntegrationFormData } from '../types';

type ApplyOutcome = { token: string | null; botUsername: string | null; recognized: boolean };

/**
 * Discriminated union that picks which mobile-setup wrapper to render.
 * - `agent`: existing agent + integration → the consumed link writes credentials
 *   onto the existing integration via the agent-scoped public endpoint.
 * - `integration-store`: no agent or integration yet → the consumed link creates
 *   a new Telegram integration via the integration-store public endpoint.
 */
export type TelegramCredentialsPasteMobileSetup =
  | { kind: 'agent'; agentIdentifier: string; integrationId: string }
  | { kind: 'integration-store' };

type TelegramCredentialsPasteProps = {
  control: Control<IntegrationFormData>;
  setValue: UseFormSetValue<IntegrationFormData>;
  isReadOnly?: boolean;
  /**
   * When set, renders an inline mobile-setup QR card under the BotFather paste
   * field so the user can finish configuration from their phone. The QR card
   * is hidden the moment the form has an `apiToken` value (typed, pasted, or
   * pre-filled from an existing integration), which also unmounts the link
   * `useQuery` and stops generating JWTs.
   */
  mobileSetup?: TelegramCredentialsPasteMobileSetup;
};

/**
 * Smart-paste affordance for the Telegram agent onboarding credentials form.
 *
 * Renders a labeled textarea. When the user pastes (or types) the full
 * BotFather confirmation message, it extracts the HTTP API token automatically
 * — no button click needed. The token is written directly into the
 * react-hook-form `apiToken` credential field.
 */
export function TelegramCredentialsPaste({
  control,
  setValue,
  isReadOnly,
  mobileSetup,
}: TelegramCredentialsPasteProps) {
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
      event.preventDefault();
      const text = event.clipboardData.getData('text/plain');
      setDraft('');
      setOutcome(apply(text));
    },
    [apply]
  );

  const dismiss = useCallback(() => setOutcome(null), []);

  if (isReadOnly) return null;

  const hasApiTokenValue =
    typeof credentials?.apiToken === 'string' && credentials.apiToken.trim().length > 0;
  const canShowMobileSetup = Boolean(mobileSetup) && !hasApiTokenValue;

  return (
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

      {outcome && <PasteOutcome outcome={outcome} onDismiss={dismiss} />}

      {canShowMobileSetup && mobileSetup && (
        <>
          <OrDivider />
          {mobileSetup.kind === 'agent' ? (
            <AgentTelegramMobileSetupCard
              agentIdentifier={mobileSetup.agentIdentifier}
              integrationId={mobileSetup.integrationId}
              layout="inline"
            />
          ) : (
            <IntegrationStoreTelegramMobileSetupCard layout="inline" />
          )}
        </>
      )}
    </div>
  );
}

function OrDivider() {
  return (
    <div className="text-text-soft my-1 flex items-center gap-2 text-label-xs">
      <span className="bg-stroke-soft h-px flex-1" />
      <span className="uppercase tracking-wide">or set up from your phone</span>
      <span className="bg-stroke-soft h-px flex-1" />
    </div>
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
