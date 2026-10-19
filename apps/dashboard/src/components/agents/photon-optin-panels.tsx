import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useId, useState } from 'react';
import { RiCheckLine, RiSmartphoneLine } from 'react-icons/ri';
import QRCode from 'react-qr-code';
import { patchSubscriber } from '@/api/subscribers';
import { Button } from '@/components/primitives/button';
import { CopyButton } from '@/components/primitives/copy-button';
import { InlineToast } from '@/components/primitives/inline-toast';
import { InputPure, InputRoot, InputWrapper } from '@/components/primitives/input';
import { Label } from '@/components/primitives/label';
import { PhoneInput } from '@/components/primitives/phone-input';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFetchSubscriber } from '@/hooks/use-fetch-subscriber';
import { useRegisterPhotonRecipient } from '@/hooks/use-register-photon-recipient';
import { QueryKeys } from '@/utils/query-keys';
import { SetupButton } from './setup-guide-primitives';
import { buildImessageFallbackHref } from './setup-guide-step-utils';
import { PHONE_PATTERN } from './whatsapp-setup-guide-utils';

export type PhotonRecipientRegistration = {
  phoneNumber: string;
  assignedPhoneNumber: string;
};

export function PhotonRegisterPanel({
  agentIdentifier,
  integrationIdentifier,
  connectSubscriberId,
  registration,
  onRegistered,
  onReset,
}: {
  agentIdentifier: string;
  integrationIdentifier: string;
  connectSubscriberId: string;
  registration: PhotonRecipientRegistration | null;
  onRegistered: (registration: PhotonRecipientRegistration) => void;
  onReset: () => void;
}) {
  const phoneFieldId = useId();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const { mutateAsync: registerRecipient, isPending } = useRegisterPhotonRecipient();

  const { data: subscriber } = useFetchSubscriber({
    subscriberId: connectSubscriberId,
    options: { enabled: Boolean(connectSubscriberId) },
  });

  useEffect(() => {
    const savedPhone = subscriber?.phone?.trim();

    if (savedPhone) {
      setPhone((current) => current || savedPhone);
    }
  }, [subscriber?.phone]);

  const handleRegister = useCallback(async () => {
    const normalizedPhone = phone.trim();

    if (!PHONE_PATTERN.test(normalizedPhone)) {
      setError('Enter a phone number in international format, including the country code.');

      return;
    }

    setError(null);

    try {
      const environment = requireEnvironment(currentEnvironment, 'No environment selected');

      await patchSubscriber({
        environment,
        subscriberId: connectSubscriberId,
        subscriber: { phone: normalizedPhone },
      });

      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchSubscriber, environment._id, connectSubscriberId],
      });

      const result = await registerRecipient({
        agentIdentifier,
        integrationIdentifier,
        phoneNumber: normalizedPhone,
      });

      if (result.success && result.assignedPhoneNumber) {
        onRegistered({ phoneNumber: normalizedPhone, assignedPhoneNumber: result.assignedPhoneNumber });

        return;
      }

      setError(result.message ?? "Photon didn't return an assigned number for this recipient.");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong registering your number.');
    }
  }, [
    agentIdentifier,
    connectSubscriberId,
    currentEnvironment,
    integrationIdentifier,
    onRegistered,
    phone,
    queryClient,
    registerRecipient,
  ]);

  if (registration) {
    return (
      <div className="flex w-full max-w-[400px] flex-col gap-2">
        <div className="text-success-base flex items-center gap-1.5">
          <RiCheckLine className="size-4" />
          <span className="text-label-xs font-medium">{registration.phoneNumber} registered on your Photon line</span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-text-sub hover:text-text-strong w-fit text-label-xs font-medium underline"
        >
          Use a different number
        </button>
      </div>
    );
  }

  return (
    <div className="border-stroke-weak bg-bg-weak flex w-full max-w-[400px] flex-col gap-4 rounded-lg border p-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={phoneFieldId} className="text-text-sub">
          Your phone number
        </Label>
        <div className="flex items-stretch gap-2">
          <PhoneInput
            id={phoneFieldId}
            value={phone}
            onChange={(value) => {
              setPhone(value ?? '');
              setError(null);
            }}
            placeholder="Enter phone number"
            className="min-w-0 flex-1"
            disabled={isPending}
          />
          <Button
            type="button"
            variant="secondary"
            size="xs"
            className="shrink-0 gap-1.5 px-2"
            onClick={handleRegister}
            disabled={!phone || isPending}
            isLoading={isPending}
          >
            Register
          </Button>
        </div>
      </div>

      {error ? <InlineToast className="w-full" variant="error" description={error} /> : null}
    </div>
  );
}

export function PhotonInboundTestPanel({
  registration,
  agentName,
}: {
  registration: PhotonRecipientRegistration;
  agentName: string;
}) {
  const { assignedPhoneNumber, phoneNumber } = registration;
  const messagesHref = buildImessageFallbackHref(assignedPhoneNumber, agentName);

  return (
    <div className="border-stroke-weak bg-bg-weak flex w-full max-w-[400px] flex-col gap-4 rounded-lg border p-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-col gap-1">
          <Label className="text-text-sub">Your agent's iMessage number</Label>
          <InputRoot size="xs" className="bg-bg-weak">
            <InputWrapper className="bg-transparent">
              <InputPure value={assignedPhoneNumber} readOnly aria-label="Agent iMessage number" type="tel" />
            </InputWrapper>
            <CopyButton valueToCopy={assignedPhoneNumber} size="xs" className="bg-bg-white shrink-0 px-2" />
          </InputRoot>
        </div>
        <SetupButton href={messagesHref} className="w-full" leadingIcon={<RiSmartphoneLine className="size-3.5" />}>
          Open in Messages
        </SetupButton>
      </div>

      <div className="flex w-full items-center gap-2.5">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-stroke-soft" />
        <span className="text-subheading-2xs text-text-soft shrink-0">OR</span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-stroke-soft" />
      </div>

      <div className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 pb-0.5">
          <div className="text-text-strong text-label-xs flex items-center gap-1 font-medium">
            <RiSmartphoneLine className="size-4 shrink-0" />
            Text from your phone
          </div>
          <div className="text-text-soft text-label-2xs flex flex-col gap-2 leading-[14px]">
            <p>
              Message from <span className="text-text-sub font-medium">{phoneNumber}</span> (or) scan with your phone to
              open the chat.
            </p>
            <p>Novu confirms as soon as it arrives.</p>
          </div>
        </div>
        <div className="bg-bg-weak flex shrink-0 items-center self-stretch rounded-lg p-1">
          <div className="bg-bg-white flex items-center justify-center rounded-md p-1.5">
            <QRCode value={messagesHref} size={96} />
          </div>
        </div>
      </div>
    </div>
  );
}
