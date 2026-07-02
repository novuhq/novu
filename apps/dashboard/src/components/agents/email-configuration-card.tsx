import { EmailProviderIdEnum } from '@novu/shared';
import { type ReactNode, useMemo } from 'react';
import { RiArrowRightSLine, RiInformation2Fill } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import type { AgentResponse } from '@/api/agents';
import { OutboundProviderSelect } from '@/components/agents/outbound-provider-select';
import { SenderAddressOverride } from '@/components/agents/sender-address-override';
import { useEmailSetupCredentials } from '@/components/agents/use-email-setup-credentials';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { ROUTES } from '@/utils/routes';

export type EmailConfigurationCardProps = {
  agent: AgentResponse;
  integrationId: string;
};

/**
 * Outbound / sender rows for embedding inside a parent shell (merged email card).
 */
export function EmailConfigurationCardBody({
  agent,
  integrationId,
  defaultSenderName,
  sharedInboundAddress,
}: EmailConfigurationCardProps & { defaultSenderName?: string; sharedInboundAddress?: string }) {
  const { integrations } = useFetchIntegrations();
  const emailIntegration = useMemo(
    () => integrations?.find((i) => i._id === integrationId && i.providerId === EmailProviderIdEnum.NovuAgent),
    [integrations, integrationId]
  );

  const {
    outboundId,
    outboundFromAddress,
    configuredAddresses,
    isOutboundDemo,
    serverUseFromAddressOverride,
    serverFromAddressOverride,
    onOutboundSelect,
    saveSenderOverride,
  } = useEmailSetupCredentials({ emailIntegration, integrations, agent });

  const inboundAddresses = useMemo(
    () => configuredAddresses.map(({ address, domain }) => (address === '*' ? `*@${domain}` : `${address}@${domain}`)),
    [configuredAddresses]
  );

  if (!emailIntegration) return null;

  return (
    <>
      <CardRow
        title="Send emails via"
        description="The Novu Email demo sender is used by default so your agent can reply out of the box. Switch to your own provider for higher volume and full deliverability control."
        divider
      >
        <OutboundProviderSelect selectedId={outboundId || undefined} onSelect={onOutboundSelect} hideLabel />
        {isOutboundDemo ? (
          <DemoProviderHint />
        ) : (
          <ManageLink to={ROUTES.INTEGRATIONS}>Manage email providers</ManageLink>
        )}
      </CardRow>

      <CardRow
        title="Sender address"
        description="By default, replies send from the agent inbox address using the agent name as the From display name. Override the address to send from another email. Reply-To always routes back to the agent so subscriber replies stay in the thread."
      >
        <SenderAddressOverride
          serverEnabled={serverUseFromAddressOverride}
          serverValue={serverFromAddressOverride}
          defaultSenderName={defaultSenderName || agent.name}
          sharedInboundAddress={sharedInboundAddress}
          outboundFromAddress={outboundFromAddress}
          inboundAddresses={inboundAddresses}
          onSave={saveSenderOverride}
          disabled={isOutboundDemo}
          disabledReason="Custom From addresses are only supported with your own email provider. Connect SendGrid, Resend, or another provider above to enable this."
        />
      </CardRow>
    </>
  );
}

function DemoProviderHint() {
  return (
    <div className="bg-bg-weak border-stroke-weak text-text-sub flex items-start gap-2 rounded-md border px-2 py-1.5">
      <RiInformation2Fill className="text-away-base mt-px size-3.5 shrink-0" aria-hidden />
      <p className="text-paragraph-xs leading-4">
        The demo sender is rate-limited and intended for testing only. Connect SendGrid, Resend, or another provider to
        send at scale.
      </p>
    </div>
  );
}

function CardRow({
  title,
  description,
  children,
  divider,
}: {
  title: string;
  description: string;
  children: ReactNode;
  divider?: boolean;
}) {
  return (
    <div
      className={
        divider
          ? 'border-stroke-weak flex items-start justify-between gap-6 border-b p-3'
          : 'flex items-start justify-between gap-6 p-3'
      }
    >
      <div className="flex max-w-[350px] min-w-0 flex-1 flex-col gap-1">
        <h4 className="text-text-sub text-label-sm font-medium leading-5">{title}</h4>
        <p className="text-text-soft text-paragraph-xs leading-4">{description}</p>
      </div>
      <div className="flex w-[340px] shrink-0 flex-col gap-1.5">{children}</div>
    </div>
  );
}

function ManageLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="text-text-sub hover:text-text-strong inline-flex items-center gap-0.5 self-start py-0.5 text-label-xs font-medium leading-4 transition-colors"
    >
      <span>{children}</span>
      <RiArrowRightSLine className="size-4" aria-hidden />
    </Link>
  );
}
