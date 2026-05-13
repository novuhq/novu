import { EmailProviderIdEnum } from '@novu/shared';
import { type ReactNode, useMemo } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
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

export function EmailConfigurationCard({ agent, integrationId }: EmailConfigurationCardProps) {
  const { integrations } = useFetchIntegrations();
  const emailIntegration = useMemo(
    () => integrations?.find((i) => i._id === integrationId && i.providerId === EmailProviderIdEnum.NovuAgent),
    [integrations, integrationId]
  );

  const {
    outboundId,
    outboundFromAddress,
    configuredAddresses,
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
    <div className="bg-bg-weak flex flex-col rounded-[10px] p-1">
      <SectionHeader>EMAIL CONFIGURATION</SectionHeader>
      <div className="bg-bg-white flex flex-col overflow-hidden rounded-md shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
        <CardRow
          title="Providers to send emails"
          description="Configure providers to send emails via Novu. Only providers configured in the Integration store will be available here."
          divider
        >
          <OutboundProviderSelect selectedId={outboundId || undefined} onSelect={onOutboundSelect} hideLabel />
          <ManageLink to={ROUTES.INTEGRATIONS}>Manage email providers</ManageLink>
        </CardRow>

        <CardRow
          title="Sender address"
          description="By default, replies use your sending provider's From address. Override it to send from another address. Reply-To always routes back to the agent so subscriber replies stay in the thread."
        >
          <SenderAddressOverride
            serverEnabled={serverUseFromAddressOverride}
            serverValue={serverFromAddressOverride}
            outboundFromAddress={outboundFromAddress}
            inboundAddresses={inboundAddresses}
            onSave={saveSenderOverride}
          />
        </CardRow>
      </div>
    </div>
  );
}

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center px-2 py-1.5">
      <span className="text-text-soft font-code text-[11px] font-medium uppercase leading-4 tracking-wider">
        {children}
      </span>
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
          ? 'border-stroke-weak flex items-start justify-between gap-4 border-b p-3'
          : 'flex items-start justify-between gap-4 p-3'
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
