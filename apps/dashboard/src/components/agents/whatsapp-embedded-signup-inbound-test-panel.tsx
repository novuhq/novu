import { CredentialsKeyEnum, type ICredentials } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { RiSmartphoneLine, RiWhatsappFill } from 'react-icons/ri';
import QRCode from 'react-qr-code';
import { validateWhatsAppToken } from '@/api/agents';
import { CopyButton } from '@/components/primitives/copy-button';
import { InputPure, InputRoot, InputWrapper } from '@/components/primitives/input';
import { Label } from '@/components/primitives/label';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useConnectSubscriberPhone } from '@/hooks/use-connect-subscriber-phone';
import { SetupButton } from './setup-guide-primitives';
import { buildWhatsAppDeepLink } from './whatsapp-setup-guide-utils';

const WHATSAPP_GREEN = '#25D366';

export function EmbeddedSignupInboundTestPanel({
  connectSubscriberId,
  credentials,
  agentName,
}: {
  connectSubscriberId: string;
  credentials: ICredentials | undefined;
  agentName: string;
}) {
  const { currentEnvironment } = useEnvironment();
  const { savedPhone } = useConnectSubscriberPhone(connectSubscriberId);

  const storedDisplayPhone =
    typeof credentials?.[CredentialsKeyEnum.From] === 'string' ? credentials[CredentialsKeyEnum.From].trim() : '';
  const apiToken =
    typeof credentials?.[CredentialsKeyEnum.ApiToken] === 'string'
      ? credentials[CredentialsKeyEnum.ApiToken].trim()
      : '';
  const phoneNumberIdentification =
    typeof credentials?.[CredentialsKeyEnum.phoneNumberIdentification] === 'string'
      ? credentials[CredentialsKeyEnum.phoneNumberIdentification].trim()
      : '';
  const businessAccountId =
    typeof credentials?.[CredentialsKeyEnum.businessAccountId] === 'string'
      ? credentials[CredentialsKeyEnum.businessAccountId].trim()
      : '';

  const displayPhoneQuery = useQuery({
    queryKey: [
      'whatsapp-display-phone',
      currentEnvironment?._id,
      phoneNumberIdentification,
      businessAccountId,
      apiToken.length,
    ],
    queryFn: ({ signal }) =>
      validateWhatsAppToken(
        requireEnvironment(currentEnvironment, 'No environment selected'),
        {
          accessToken: apiToken,
          phoneNumberIdentification,
          businessAccountId: businessAccountId || undefined,
        },
        signal
      ),
    enabled: Boolean(!storedDisplayPhone && currentEnvironment && apiToken && phoneNumberIdentification),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const businessDisplayPhone = storedDisplayPhone || displayPhoneQuery.data?.displayPhoneNumber?.trim() || '';
  const whatsAppUrl = businessDisplayPhone ? buildWhatsAppDeepLink(businessDisplayPhone, agentName) : '';

  if (!businessDisplayPhone || !whatsAppUrl) {
    return (
      <div className="border-stroke-weak bg-bg-weak flex w-full max-w-[400px] flex-col gap-4 rounded-lg border p-3">
        <p className="text-text-soft text-label-xs leading-4">
          Send any WhatsApp message to your connected business number to confirm Novu receives it.
        </p>
      </div>
    );
  }

  return (
    <div className="border-stroke-weak bg-bg-weak flex w-full max-w-[400px] flex-col gap-4 rounded-lg border p-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-col gap-1">
          <Label className="text-text-sub">Agent WhatsApp number</Label>
          <InputRoot size="xs" className="bg-bg-weak">
            <InputWrapper className="bg-transparent">
              <InputPure value={businessDisplayPhone} readOnly aria-label="Agent WhatsApp number" type="tel" />
            </InputWrapper>
            <CopyButton valueToCopy={businessDisplayPhone} size="xs" className="bg-bg-white shrink-0 px-2" />
          </InputRoot>
        </div>
        <SetupButton
          href={whatsAppUrl}
          className="w-full"
          leadingIcon={<RiWhatsappFill className="size-3.5" color={WHATSAPP_GREEN} />}
        >
          Open in WhatsApp
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
            Setup from your phone
          </div>
          <div className="text-text-soft text-label-2xs flex flex-col gap-2 leading-[14px]">
            <p>
              Message from <span className="text-text-sub font-medium">{savedPhone || 'your phone'}</span> (or) scan with
              your phone to open the chat.
            </p>
            <p>Novu confirms as soon as it arrives.</p>
          </div>
        </div>
        <div className="bg-bg-weak flex shrink-0 items-center self-stretch rounded-lg p-1">
          <div className="bg-bg-white relative flex items-center justify-center rounded-md p-1.5">
            <QRCode value={whatsAppUrl} size={96} />
            <div className="bg-bg-white absolute left-1/2 top-1/2 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full">
              <RiWhatsappFill className="size-4" color={WHATSAPP_GREEN} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
