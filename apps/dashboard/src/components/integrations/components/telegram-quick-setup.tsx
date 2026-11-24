import { ChatProviderIdEnum, CredentialsKeyEnum, type IEnvironment } from '@novu/shared';
import { useEffect, useId, useState } from 'react';
import { type Control, type UseFormSetValue, useWatch } from 'react-hook-form';
import { RiClipboardLine, RiFileCopyLine, RiPhoneFindLine, RiRefreshLine } from 'react-icons/ri';
import { QRCode } from 'react-qr-code';
import { SetupButton, SetupStep, SetupStepperRail } from '@/components/agents/setup-guide-primitives';
import {
  LINK_REFRESH_INTERVAL_MS,
  useIntegrationStoreTelegramMobileLink,
} from '@/components/agents/use-integration-store-telegram-mobile-link';
import { Button } from '@/components/primitives/button';
import { FormField, FormItem, FormMessage } from '@/components/primitives/form/form';
import { SecretInput } from '@/components/primitives/secret-input';
import { showSuccessToast } from '@/components/primitives/sonner-helpers';
import { parseBotFatherMessage } from '@/utils/telegram-bot-token';
import { cn } from '@/utils/ui';
import type { IntegrationFormData } from '../types';
import { ProviderIcon } from './provider-icon';

const BOTFATHER_URL = 'https://t.me/BotFather';
const TOKEN_FIELD = `credentials.${CredentialsKeyEnum.ApiToken}` as const;

type TelegramQuickSetupProps = {
  control: Control<IntegrationFormData>;
  setValue: UseFormSetValue<IntegrationFormData>;
  /** Where a bot set up from the phone is created: the environment picked above. */
  environment?: IEnvironment;
  isReadOnly?: boolean;
};

/**
 * Quick setup for Telegram: create a bot with BotFather, then paste its confirmation message (Novu finds the token
 * in it) or finish from the phone, where the bot was created.
 */
export function TelegramQuickSetup({ control, setValue, environment, isReadOnly }: TelegramQuickSetupProps) {
  const token = useWatch({ control, name: TOKEN_FIELD });
  const hasToken = typeof token === 'string' && token.trim().length > 0;

  return (
    <SetupStepperRail className="-ml-3 pb-4">
      <SetupStep
        index={1}
        status="current"
        title="Create a bot with BotFather"
        description="Open @BotFather and run /newbot. Pick a name and a username that ends in bot."
        extraContent={
          <div className="flex flex-col gap-4">
            <SetupButton href={BOTFATHER_URL}>Open BotFather</SetupButton>
            <div className="bg-bg-muted w-36 rounded-lg p-1">
              <div className="bg-bg-white flex flex-col items-center gap-1 rounded px-2 pb-2 pt-2.5">
                <TelegramQrCode value={BOTFATHER_URL} size={84} />
                <p className="text-text-sub text-center text-[10px] font-medium leading-[14px]">
                  Scan with your phone to open in Telegram
                </p>
              </div>
            </div>
          </div>
        }
      />
      <SetupStep
        index={2}
        status="current"
        title="Paste the BotFather message"
        description="Paste the whole confirmation message and Novu finds the token in it, or finish from your phone."
        extraContent={
          <div className="bg-bg-white flex flex-col gap-2 rounded-lg">
            <div className="bg-bg-weak border-stroke-weak flex flex-col gap-4 rounded-lg border px-2 py-2">
              {/* A token is on its way in, so the phone link stops, and can't create a second integration. */}
              {!hasToken && !isReadOnly && (
                <>
                  <PhoneSetup environment={environment} />
                  <OrDivider />
                </>
              )}
              <div className="flex flex-col gap-3">
                <RiClipboardLine className="text-text-sub size-5" />
                <div className="text-label-xs flex flex-col gap-1">
                  <p className="text-text-strong">Paste the full message below</p>
                  <p className="text-text-sub">
                    Copy the full confirmation message from BotFather and paste it here — the token is set
                    automatically.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-stroke-weak h-px" />
            <BotTokenField control={control} setValue={setValue} isReadOnly={isReadOnly} />
          </div>
        }
      />
    </SetupStepperRail>
  );
}

/** Takes the token on its own, or the whole BotFather message, and keeps only the token. */
function BotTokenField({
  control,
  setValue,
  isReadOnly,
}: {
  control: Control<IntegrationFormData>;
  setValue: UseFormSetValue<IntegrationFormData>;
  isReadOnly?: boolean;
}) {
  const inputId = useId();

  return (
    <FormField
      control={control}
      name={TOKEN_FIELD}
      rules={{ required: 'Bot token is required' }}
      render={({ field, fieldState }) => {
        const setToken = (value: string) =>
          setValue(TOKEN_FIELD, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });

        return (
          <FormItem className="flex flex-col gap-1">
            <label htmlFor={inputId} className="text-label-xs text-text-sub">
              Bot token <span className="text-primary-base">*</span>
            </label>
            <SecretInput
              id={inputId}
              size="xs"
              autoComplete="off"
              spellCheck={false}
              placeholder="Enter bot token or paste the full message here, we’ll parse it..."
              value={typeof field.value === 'string' ? field.value : ''}
              disabled={isReadOnly}
              hasError={!!fieldState.error}
              onBlur={field.onBlur}
              onChange={(value) => setToken(parseBotFatherMessage(value).token ?? value)}
              onPaste={(event) => {
                const { token } = parseBotFatherMessage(event.clipboardData.getData('text/plain'));
                if (!token) return;

                event.preventDefault();
                setToken(token);
              }}
            />
            {fieldState.error?.message && <FormMessage>{fieldState.error.message}</FormMessage>}
          </FormItem>
        );
      }}
    />
  );
}

/** A setup link to open on the phone, where BotFather sent the token. */
function PhoneSetup({ environment }: { environment?: IEnvironment }) {
  const linkQuery = useIntegrationStoreTelegramMobileLink({ environment });
  const link = linkQuery.data;

  const copyLink = async () => {
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link.url);
      showSuccessToast('Mobile setup link copied');
    } catch {
      // Clipboard access can be denied; the QR code still works.
    }
  };

  return (
    <div className="flex items-start gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-label-xs text-text-strong flex items-center gap-1">
            <RiPhoneFindLine className="size-4" />
            Setup from your phone
          </p>
          <p className="text-label-xs text-text-soft">
            Scan or open the link, then paste the full BotFather message. Refreshes every 5 minutes.
          </p>
          {linkQuery.isError && (
            <p className="text-label-xs text-error-base">Couldn’t generate a setup link. Try refreshing.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            mode="outline"
            size="xs"
            leadingIcon={RiFileCopyLine}
            onClick={copyLink}
            disabled={!link}
            className="text-text-sub gap-0.5 pl-2 pr-1 py-1.5"
          >
            <span className="px-1">Copy link</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            mode="ghost"
            size="xs"
            leadingIcon={RiRefreshLine}
            onClick={() => linkQuery.refetch()}
            // Without an environment there's nowhere to create the bot, and the request can't be made.
            disabled={!environment || linkQuery.isFetching}
            className="text-text-sub gap-0.5 px-1 py-1.5"
          >
            <span className="px-1">Refresh token</span>
          </Button>
        </div>
      </div>
      <div className="bg-bg-muted shrink-0 rounded-lg p-1">
        <div className="bg-bg-white flex w-[98px] flex-col items-center gap-1 rounded px-1 pb-1 pt-2">
          {link ? (
            <TelegramQrCode
              value={link.url}
              size={82}
              className={cn('transition-opacity', linkQuery.isFetching && 'opacity-60')}
            />
          ) : (
            <div className="bg-bg-weak size-[82px] animate-pulse rounded" role="img" aria-label="Loading QR code" />
          )}
          {link && (
            <ResetsIn
              resetsAt={Math.min(
                new Date(link.expiresAt).getTime(),
                linkQuery.dataUpdatedAt + LINK_REFRESH_INTERVAL_MS
              )}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** When the shown link is replaced: on the 5-minute refresh, or when it expires if that's sooner. */
function ResetsIn({ resetsAt }: { resetsAt: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, resetsAt - now);
  const minutes = Math.floor(remainingMs / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1000);

  return (
    <p className="text-text-soft flex items-center gap-1 text-[10px] font-medium leading-[14px]">
      <RiRefreshLine className="size-2.5" />
      {remainingMs > 0 ? `Resets in ${minutes}:${seconds.toString().padStart(2, '0')}` : 'Refreshing…'}
    </p>
  );
}

/** A QR code with the Telegram logo in the middle; high error correction keeps it scannable under the logo. */
function TelegramQrCode({ value, size, className }: { value: string; size: number; className?: string }) {
  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <QRCode value={value} size={size} level="H" />
      <span className="bg-bg-white absolute left-1/2 top-1/2 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full">
        <ProviderIcon providerId={ChatProviderIdEnum.Telegram} providerDisplayName="Telegram" className="size-4" />
      </span>
    </div>
  );
}

function OrDivider() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="bg-stroke-soft h-px flex-1" />
      <span className="text-text-soft text-[11px] font-medium uppercase leading-3 tracking-[0.22px]">Or paste it</span>
      <span className="bg-stroke-soft h-px flex-1" />
    </div>
  );
}
