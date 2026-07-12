import { CredentialsKeyEnum, EmailProviderIdEnum, type IIntegration } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { RiArrowRightSLine, RiArrowRightUpLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { type AgentResponse, validateWhatsAppToken } from '@/api/agents';
import { AgentInboxCardRow, AgentInboxCardRowInfoTitle } from '@/components/agents/agent-inbox-card-row';
import { CopyableEmailAddress } from '@/components/agents/copyable-email-address';
import { EmailSubscriberAccessToggle } from '@/components/agents/email-subscriber-access-toggle';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';

const CREATE_SUBSCRIBER_DOCS_URL = 'https://docs.novu.co/api-reference/subscribers/create-a-subscriber';

const quietLinkClassName =
  'text-text-sub hover:text-text-strong inline-flex items-center gap-0.5 text-label-xs font-medium leading-4 transition-colors';

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
 * Persistent post-connect WHATSAPP card: business phone, subscriber.phone guidance, and the
 * agent-wide open-access toggle. Mirrors EmailInboxCardBody row chrome without email inbox toggles.
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

  const hasEmailChannel = (agent.integrations ?? []).some(
    (integration) => integration.providerId === EmailProviderIdEnum.NovuAgent
  );

  const subscribersPath = currentEnvironment?.slug
    ? buildRoute(ROUTES.SUBSCRIBERS, { environmentSlug: currentEnvironment.slug })
    : ROUTES.SUBSCRIBERS;

  const subscriberAccessInfoTooltip =
    "With Open, a lightweight subscriber is created from the sender's phone so the agent can reply. It merges into their account if they later sign up with the same phone.";

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

      <AgentInboxCardRow
        title="Subscriber phone numbers"
        description={
          <>
            Each user needs an E.164 phone on <code className="text-text-sub">subscriber.phone</code> so the agent can
            identify and reply to them.
          </>
        }
        divider
      />

      <AgentInboxCardRow
        title={
          <AgentInboxCardRowInfoTitle label="Who can message this agent" infoTooltip={subscriberAccessInfoTooltip} />
        }
        description="Open accepts WhatsApp from anyone. Off replies only to known subscribers."
        divider={false}
        footer={
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Link to={subscribersPath} className={quietLinkClassName}>
                <span>Add subscribers manually</span>
                <RiArrowRightSLine className="size-3.5" aria-hidden />
              </Link>
              <a
                href={CREATE_SUBSCRIBER_DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={quietLinkClassName}
              >
                <span>Create via SDK</span>
                <RiArrowRightUpLine className="size-3.5" aria-hidden />
              </a>
            </div>
            {hasEmailChannel ? (
              <p className="text-text-soft text-label-xs leading-4">
                <strong className="font-medium">This setting applies to all channels on this agent.</strong>
              </p>
            ) : null}
          </div>
        }
      >
        <div className="flex items-center justify-end gap-2">
          <span className="text-text-soft text-label-xs font-medium leading-4">Accept WhatsApp from anyone</span>
          <EmailSubscriberAccessToggle agent={agent} ariaLabel="Accept WhatsApp from anyone" />
        </div>
      </AgentInboxCardRow>
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
