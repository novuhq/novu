import { CredentialsKeyEnum, type ICredentials } from '@novu/shared';
import { RiSendPlaneFill } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { InputPure, InputRoot, InputWrapper } from '@/components/primitives/input';
import { useConnectSubscriberPhone } from '@/hooks/use-connect-subscriber-phone';
import { ReadOnlyValueRow, SetupButton } from './setup-guide-primitives';
import { buildWhatsAppDeepLink } from './whatsapp-setup-guide-utils';

export function EmbeddedSignupInboundTestPanel({
  connectSubscriberId,
  credentials,
}: {
  connectSubscriberId: string;
  credentials: ICredentials | undefined;
}) {
  const { phone, setPhone, savedPhone, isPhoneSaved, isSaving, saveError, clearSaveError, handleSavePhone } =
    useConnectSubscriberPhone(connectSubscriberId);

  const businessDisplayPhone =
    typeof credentials?.[CredentialsKeyEnum.From] === 'string' ? credentials[CredentialsKeyEnum.From].trim() : '';
  const whatsAppUrl = businessDisplayPhone ? buildWhatsAppDeepLink(businessDisplayPhone) : '';

  if (!isPhoneSaved) {
    return (
      <div className="border-stroke-soft flex w-full max-w-[400px] flex-col gap-2 rounded-md border p-3">
        <p className="text-text-strong text-label-xs font-medium leading-4">Your phone number</p>
        <p className="text-text-soft text-label-xs leading-4">
          Enter the number you&rsquo;ll message from so Novu can link inbound replies to your account.
        </p>
        <div className="flex items-stretch gap-2">
          <InputRoot size="xs" hasError={Boolean(saveError)} className="flex-1">
            <InputWrapper>
              <InputPure
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  if (saveError) {
                    clearSaveError();
                  }
                }}
                type="tel"
                inputMode="tel"
                placeholder="+14155551234"
                autoComplete="tel"
                disabled={isSaving}
              />
            </InputWrapper>
          </InputRoot>
          <Button
            type="button"
            variant="secondary"
            size="xs"
            className="px-2"
            onClick={() => {
              void handleSavePhone();
            }}
            disabled={!phone || isSaving}
            isLoading={isSaving}
          >
            Save
          </Button>
        </div>
        {saveError ? <p className="text-error-base text-label-xs leading-4">{saveError}</p> : null}
      </div>
    );
  }

  return (
    <div className="border-stroke-soft flex w-full max-w-[400px] flex-col gap-3 rounded-md border p-3">
      <p className="text-text-strong text-label-xs font-medium leading-4">Send a message to your business number</p>
      {businessDisplayPhone && whatsAppUrl ? (
        <>
          <ReadOnlyValueRow label="Your WhatsApp business number" value={businessDisplayPhone} />
          <SetupButton href={whatsAppUrl} leadingIcon={<RiSendPlaneFill className="size-3.5" />}>
            Open in WhatsApp
          </SetupButton>
        </>
      ) : (
        <p className="text-text-soft text-label-xs leading-4">
          Send any WhatsApp message to your connected business number to confirm Novu receives it.
        </p>
      )}
      <p className="text-text-soft text-label-xs leading-4">
        Message from <span className="text-text-sub font-medium">{savedPhone}</span> — Novu is listening and will
        confirm as soon as it arrives.
      </p>
    </div>
  );
}
