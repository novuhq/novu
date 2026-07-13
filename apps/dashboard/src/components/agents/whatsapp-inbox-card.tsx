import { CredentialsKeyEnum, type IIntegration } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { type AgentResponse, validateWhatsAppToken } from '@/api/agents';
import { AgentInboxCardRow } from '@/components/agents/agent-inbox-card-row';
import { CopyableEmailAddress } from '@/components/agents/copyable-email-address';
import { SubscriberAccessGuidanceRow } from '@/components/agents/subscriber-access-guidance-row';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';

function readCredentialString(credentials: IIntegration['credentials'] | undefined, key: CredentialsKeyEnum): string {
  const value = credentials?.[key as keyof NonNullable<IIntegration['credentials']>];

  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

export type WhatsAppInboxCardProps = {
  whatsappIntegration: IIntegration;
  agent: AgentResponse;
};

/**
 * Persistent post-connect WHATSAPP card: business phone display plus state-aware
 * subscriber-access education. The agent-wide open-access toggle lives on Agent behavior.
 */
export function WhatsAppInboxCardBody({ whatsappIntegration, agent }: WhatsAppInboxCardProps) {
  const { currentEnvironment } = useEnvironment();
  const credentials = whatsappIntegration.credentials ?? {};
  const apiToken = readCredentialString(credentials, CredentialsKeyEnum.ApiToken);
  const phoneNumberIdentification = readCredentialString(credentials, CredentialsKeyEnum.phoneNumberIdentification);
  const businessAccountId = readCredentialString(credentials, CredentialsKeyEnum.businessAccountId);

  const displayPhoneQuery = useQuery({
    queryKey: [
      'whatsapp-display-phone',
      currentEnvironment?._id,
      whatsappIntegration._id,
      phoneNumberIdentification,
      // Token length only - avoid putting the secret in the cache key.
      apiToken.length,
    ],
    queryFn: () =>
      validateWhatsAppToken(requireEnvironment(currentEnvironment, 'No environment selected'), {
        accessToken: apiToken,
        phoneNumberIdentification: phoneNumberIdentification || undefined,
        businessAccountId: businessAccountId || undefined,
      }),
    enabled: Boolean(currentEnvironment && apiToken && phoneNumberIdentification),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Prefer Meta's display_phone_number - phoneNumberIdentification is an opaque Phone Number ID.
  const businessPhone = useMemo(
    () => displayPhoneQuery.data?.displayPhoneNumber?.trim() || undefined,
    [displayPhoneQuery.data?.displayPhoneNumber]
  );

  return (
    <>
      <AgentInboxCardRow
        title="Your WhatsApp number"
        description="Users reach this agent by messaging your business phone number."
        divider
      >
        <div className="flex justify-end">
          {businessPhone ? (
            <CopyableEmailAddress email={businessPhone} className="min-w-0" />
          ) : (
            <span className="text-text-soft text-label-xs font-medium leading-4">
              {displayPhoneQuery.isLoading ? 'Looking up number…' : 'Phone number unavailable'}
            </span>
          )}
        </div>
      </AgentInboxCardRow>

      <SubscriberAccessGuidanceRow channel="whatsapp" agent={agent} />
    </>
  );
}

export function WhatsAppInboxCard({ whatsappIntegration, agent }: WhatsAppInboxCardProps) {
  return (
    <div className="bg-bg-weak flex flex-col rounded-[10px] p-1">
      <div className="flex items-center px-2 py-1.5">
        <span className="text-text-soft font-code text-[11px] font-medium uppercase leading-4 tracking-wider">
          WHATSAPP
        </span>
      </div>
      <div className="bg-bg-white flex flex-col overflow-hidden rounded-md shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
        <WhatsAppInboxCardBody whatsappIntegration={whatsappIntegration} agent={agent} />
      </div>
    </div>
  );
}
