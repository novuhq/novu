import { type Control, useWatch } from 'react-hook-form';
import {
  AgentTelegramMobileSetupCard,
  IntegrationStoreTelegramMobileSetupCard,
} from '@/components/agents/telegram-mobile-setup-card';
import { Separator } from '@/components/primitives/separator';
import type { IntegrationFormData } from '../types';

/**
 * Discriminated union that picks which mobile-setup wrapper to render.
 * - `agent`: existing agent + integration → the consumed link writes credentials
 *   onto the existing integration via the agent-scoped public endpoint.
 * - `integration-store`: no agent or integration yet → the consumed link creates
 *   a new Telegram integration via the integration-store public endpoint.
 */
export type TelegramCredentialsPasteMobileSetup =
  | { kind: 'agent'; integrationIdentifier: string; testSubscriberId?: string | null }
  | { kind: 'integration-store' };

type TelegramCredentialsPasteProps = {
  control: Control<IntegrationFormData>;
  isReadOnly?: boolean;
  /**
   * When set, renders an inline mobile-setup QR card so the user can finish
   * configuration from their phone. The QR card is hidden the moment the form
   * has an `apiToken` value (typed, pasted, or pre-filled from an existing
   * integration), which also unmounts the link `useQuery` and stops issuing
   * setup links.
   */
  mobileSetup?: TelegramCredentialsPasteMobileSetup;
};

/**
 * Telegram credentials helper panel matching the Figma credentials design.
 *
 * Shows phone QR setup first, then an OR divider and paste instructions.
 * The Bot token field itself lives in `CredentialSection` and accepts either
 * a raw token or a full BotFather confirmation message.
 */
export function TelegramCredentialsPaste({ control, isReadOnly, mobileSetup }: TelegramCredentialsPasteProps) {
  const credentials = useWatch({ control, name: 'credentials' });

  if (isReadOnly) return null;

  const hasApiTokenValue = typeof credentials?.apiToken === 'string' && credentials.apiToken.trim().length > 0;
  const canShowMobileSetup = Boolean(mobileSetup) && !hasApiTokenValue;

  if (!canShowMobileSetup || !mobileSetup) return null;

  return (
    <>
      <div className="border-stroke-weak bg-bg-weak flex flex-col gap-4 overflow-hidden rounded-lg border px-2 py-2">
        {mobileSetup.kind === 'agent' ? (
          <AgentTelegramMobileSetupCard
            integrationIdentifier={mobileSetup.integrationIdentifier}
            testSubscriberId={mobileSetup.testSubscriberId}
            layout="inline"
          />
        ) : (
          <IntegrationStoreTelegramMobileSetupCard layout="inline" />
        )}

        <OrDivider />

        <div className="flex flex-col gap-3">
          <span className="flex size-5 shrink-0 items-center justify-center">
            <img
              src="/images/telegram-setup/clipboard-check.svg"
              alt=""
              aria-hidden="true"
              className="h-[18px] w-[15px]"
            />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-text-strong text-label-xs font-medium leading-4">Paste the full message below</p>
            <p className="text-text-sub text-label-xs leading-4">
              Copy the full confirmation message from BotFather and paste it here — the token is set automatically.
            </p>
          </div>
        </div>
      </div>
      <Separator variant="line" />
    </>
  );
}

function OrDivider() {
  return (
    <div className="text-text-soft flex items-center justify-center gap-2.5">
      <span className="from-transparent to-stroke-soft h-px flex-1 bg-gradient-to-r" />
      <span className="text-subheading-2xs uppercase tracking-[0.22px]">OR</span>
      <span className="from-stroke-soft to-transparent h-px flex-1 bg-gradient-to-r" />
    </div>
  );
}
