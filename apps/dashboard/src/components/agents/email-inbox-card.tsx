import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsBoolean, type IIntegration } from '@novu/shared';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { RiAddLine, RiCloseLine, RiInformation2Line } from 'react-icons/ri';
import { useSearchParams } from 'react-router-dom';
import type { AgentIntegrationEmbedded, AgentResponse } from '@/api/agents';
import { CopyableEmailAddress } from '@/components/agents/copyable-email-address';
import { CompactButton } from '@/components/primitives/button-compact';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { Switch } from '@/components/primitives/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { UpgradeCTATooltip } from '@/components/upgrade-cta-tooltip';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { useUpdateIntegration } from '@/hooks/use-update-integration';
import { cn } from '@/utils/ui';
import { AgentCustomDomainSheet } from './agent-custom-domain-sheet';
import { useEmailSetupCredentials } from './use-email-setup-credentials';

const DELIVERABILITY_DOCS_URL = 'https://docs.novu.co/platform/domains';

export type EmailInboxCardProps = {
  emailIntegration: IIntegration;
  /**
   * The embedded integration payload from the agent-integration link response.
   * Carries server-computed fields the dashboard would otherwise have to
   * recompute: `sharedInboundAddress` and `sharedInboxDisabled`.
   * `sharedInboundAddress` is built from `emailSlugPrefix` + `inboxRoutingKey`
   * on the server using `NOVU_AGENT_SHARED_INBOUND_DOMAIN`, which is not
   * exposed to the dashboard.
   */
  integrationEmbedded: AgentIntegrationEmbedded;
  agent: AgentResponse;
  /**
   * Hide the "Connect custom domain" add-form + tip. Used when the parent surface (the layer-2
   * "What's next" guide) owns the branded-address add flow, so this card stays a pure manager
   * (enable + shared-inbox toggles + the existing address list with remove).
   */
  hideCustomAddressForm?: boolean;
};

/**
 * Post-setup inbox manager: lists the agent's inbound addresses (Novu shared
 * inbox + each custom-domain `DomainRouteTypeEnum.AGENT` route) and lets the
 * user disable the shared inbox or remove a custom one. There is no notion of
 * a "primary" address — every listed address routes inbound. The "+ Connect
 * custom domain" affordance reveals the add-form on demand instead of always
 * occupying screen real estate.
 */
export function EmailInboxCardBody({
  emailIntegration,
  integrationEmbedded,
  agent,
  hideCustomAddressForm = false,
}: EmailInboxCardProps) {
  const { mutateAsync: updateIntegration } = useUpdateIntegration();
  const { integrations } = useFetchIntegrations();
  const { subscription } = useFetchSubscription();
  const domainsEnabled = getFeatureForTierAsBoolean(
    FeatureNameEnum.DOMAINS_BOOLEAN,
    subscription?.apiServiceLevel || ApiServiceLevelEnum.FREE
  );

  const { configuredAddresses, domains, addAddress, removeAddress, setSharedInboxDisabled, isSharedToggleUpdating } =
    useEmailSetupCredentials({ emailIntegration, integrations, agent });

  const serverCredentials = emailIntegration.credentials ?? {};
  const [isToggling, setIsToggling] = useState(false);
  const [isDomainSheetOpen, setIsDomainSheetOpen] = useState(false);
  const [returnDomainName, setReturnDomainName] = useState<string | undefined>(undefined);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeRef = useRef(emailIntegration.active !== false);
  const hasHandledDomainReturnRef = useRef(false);

  const enabled = emailIntegration.active !== false;
  const inboxSectionDisabled = !enabled;

  const sharedAddress = integrationEmbedded.sharedInboundAddress;
  const sharedDisabled = Boolean(integrationEmbedded.sharedInboxDisabled);
  const hasCustomAddresses = configuredAddresses.length > 0;

  // Domain Connect returns the user to this page with a `?customDomain=<name>` marker; reopen the
  // sheet on that domain so verification resumes inline, then strip the marker from the URL.
  const customDomainReturn = searchParams.get('customDomain');
  useEffect(() => {
    if (!customDomainReturn || hasHandledDomainReturnRef.current || !domainsEnabled) {
      return;
    }

    hasHandledDomainReturnRef.current = true;
    setReturnDomainName(customDomainReturn);
    setIsDomainSheetOpen(true);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('customDomain');
    nextParams.delete('domainConnect');
    nextParams.delete('error');
    nextParams.delete('error_description');
    setSearchParams(nextParams, { replace: true });
  }, [customDomainReturn, domainsEnabled, searchParams, setSearchParams]);

  async function persistActive(nextActive: boolean): Promise<void> {
    const previousActive = activeRef.current;
    try {
      await updateIntegration({
        integrationId: emailIntegration._id,
        data: {
          name: emailIntegration.name,
          identifier: emailIntegration.identifier,
          active: nextActive,
          primary: emailIntegration.primary ?? false,
          credentials: serverCredentials as Record<string, unknown>,
          configurations: {},
          check: false,
        },
      });
      activeRef.current = nextActive;
    } catch (err) {
      activeRef.current = previousActive;
      throw err;
    }
  }

  async function handleToggle(nextValue: boolean) {
    setIsToggling(true);
    try {
      await persistActive(nextValue);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save email inbox setting.';
      showErrorToast(message, 'Settings not saved');
    } finally {
      setIsToggling(false);
    }
  }

  const tooltipCopy = useMemo(
    () =>
      sharedAddress
        ? `Inbound mail sent to ${sharedAddress} is delivered to this agent.`
        : 'Replies and incoming mail to this address are delivered to the agent.',
    [sharedAddress]
  );

  function handleSharedToggle(nextEnabled: boolean) {
    // Disabling is only safe when at least one custom-domain address remains
    // so the agent isn't left with zero inbound paths.
    if (!nextEnabled && !hasCustomAddresses) {
      showErrorToast(
        'Connect a custom domain first — the agent must keep at least one inbound address.',
        'Cannot turn off the shared inbox'
      );

      return;
    }
    setSharedInboxDisabled(!nextEnabled);
  }

  function handleConnectDomain() {
    if (!domainsEnabled) {
      return;
    }

    setIsDomainSheetOpen(true);
  }

  function handleDomainSheetOpenChange(open: boolean) {
    setIsDomainSheetOpen(open);

    if (!open) {
      setReturnDomainName(undefined);
    }
  }

  const connectDomainButtonClassName =
    'text-text-sub hover:text-text-strong inline-flex items-center gap-0.5 self-start py-1 text-label-xs font-medium leading-4 transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-text-sub';

  return (
    <>
      <CardRow title="Enable email inbox" description="Let users reach this agent via email." divider>
        <div className="flex justify-end">
          <Switch checked={enabled} disabled={isToggling} onCheckedChange={handleToggle} />
        </div>
      </CardRow>

      <CardRow
        title={
          <span className="flex items-center gap-1">
            Inbound addresses
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label="More info">
                  <RiInformation2Line className="text-text-soft size-5" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent>{tooltipCopy}</TooltipContent>
            </Tooltip>
          </span>
        }
        description="Users can reach this agent at any of the addresses below — share one in your product's contact or reply flows, support footer, or docs. Mail delivered to any of them is forwarded to the agent."
        divider
        disabled={inboxSectionDisabled}
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            {sharedAddress ? (
              <SharedInboxRow
                address={sharedAddress}
                disabled={sharedDisabled}
                toggleDisabled={isSharedToggleUpdating || (!sharedDisabled && !hasCustomAddresses)}
                toggleTooltip={
                  !hasCustomAddresses
                    ? 'Connect a custom domain before turning this off.'
                    : 'Off drops mail to the shared agentconnect.sh address. Custom-domain inboxes still deliver.'
                }
                onToggle={handleSharedToggle}
              />
            ) : null}

            {configuredAddresses.map((addr) => {
              const full = addr.address === '*' ? `*@${addr.domain}` : `${addr.address}@${addr.domain}`;

              return (
                <InboxRow
                  key={`${addr.address}-${addr.domainId}`}
                  address={full}
                  trailing={
                    <CompactButton
                      type="button"
                      variant="ghost"
                      size="md"
                      icon={RiCloseLine}
                      aria-label={`Remove ${full}`}
                      className="text-text-soft hover:text-destructive"
                      onClick={() => removeAddress(addr.address, addr.domainId)}
                    />
                  }
                />
              );
            })}
          </div>

          {!hideCustomAddressForm ? (
            domainsEnabled ? (
              <button
                type="button"
                disabled={inboxSectionDisabled}
                onClick={handleConnectDomain}
                className={connectDomainButtonClassName}
              >
                <RiAddLine className="size-3.5" aria-hidden />
                <span>Connect custom domain</span>
              </button>
            ) : (
              <UpgradeCTATooltip
                description="To create domains, upgrade your plan."
                utmCampaign="domains"
                utmSource="agent-email-inbox"
              >
                <button type="button" disabled className={connectDomainButtonClassName}>
                  <RiAddLine className="size-3.5" aria-hidden />
                  <span>Connect custom domain</span>
                </button>
              </UpgradeCTATooltip>
            )
          ) : null}

          {!hideCustomAddressForm ? (
            <p className="text-text-soft text-paragraph-xs leading-4">
              {'Custom domains route inbound mail to your agent (MX) and let your replies pass SPF, DKIM, and DMARC. '}
              <a
                href={DELIVERABILITY_DOCS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-sub underline underline-offset-2"
              >
                Learn about deliverability
              </a>
            </p>
          ) : null}
        </div>
      </CardRow>

      <AgentCustomDomainSheet
        open={isDomainSheetOpen}
        onOpenChange={handleDomainSheetOpenChange}
        initialDomainName={returnDomainName}
        domains={domains}
        configuredAddresses={configuredAddresses}
        onAddAddress={addAddress}
      />
    </>
  );
}

type InboxRowProps = {
  address: string;
  badge?: string;
  trailing?: ReactNode;
};

/**
 * Minimal row: lighter visual weight than the previous bordered/shadowed
 * pill — relies on background tint + subtle stroke for separation.
 */
function buildInboxRowTrailing(badge?: string, trailing?: ReactNode) {
  if (!trailing && !badge) {
    return undefined;
  }

  const badgeNode = badge ? (
    <span className="text-text-soft text-[10px] font-medium uppercase leading-3 tracking-wide">{badge}</span>
  ) : null;

  if (!trailing) {
    return badgeNode ?? undefined;
  }

  return (
    <div className="flex items-center gap-1">
      {badgeNode}
      {trailing}
    </div>
  );
}

function InboxRow({ address, badge, trailing }: InboxRowProps) {
  return <CopyableEmailAddress email={address} trailing={buildInboxRowTrailing(badge, trailing)} />;
}

type SharedInboxRowProps = {
  address: string;
  disabled: boolean;
  toggleDisabled: boolean;
  toggleTooltip: string;
  onToggle: (nextEnabled: boolean) => void;
};

/**
 * Variant of `InboxRow` for the Novu shared inbox. The row stays visually
 * enabled even when the user has flipped the switch off — only the toggle's
 * off-state signals the disabled status. Hovering anywhere on the row body
 * surfaces a tooltip explaining what "off" means (drops inbound mail to the
 * shared `agentconnect.sh` address while keeping custom-domain routes
 * intact), avoiding the "this row looks broken" impression that a faded body
 * gives.
 */
function SharedInboxRow({ address, disabled, toggleDisabled, toggleTooltip, onToggle }: SharedInboxRowProps) {
  const switchControl = (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Switch
            aria-label={disabled ? 'Enable the shared inbox' : 'Disable the shared inbox'}
            checked={!disabled}
            onCheckedChange={onToggle}
            disabled={toggleDisabled}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{toggleTooltip}</TooltipContent>
    </Tooltip>
  );

  const rowContent = <CopyableEmailAddress email={address} trailing={switchControl} />;

  if (!disabled) {
    return rowContent;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{rowContent}</TooltipTrigger>
      <TooltipContent className="max-w-xs">
        Shared inbox is off — mail to this address is dropped. Flip the switch to re-enable it.
      </TooltipContent>
    </Tooltip>
  );
}

function CardRow({
  title,
  description,
  children,
  divider,
  disabled,
}: {
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
  divider?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-6 p-3',
        divider && 'border-stroke-weak border-b',
        disabled && 'opacity-60'
      )}
    >
      <div className="flex min-w-0 max-w-[350px] flex-1 flex-col gap-1">
        <div className="text-text-sub text-label-sm font-medium leading-5">{title}</div>
        <p className="text-text-soft text-paragraph-xs leading-4">{description}</p>
      </div>
      <div className="flex w-[360px] shrink-0 flex-col gap-1.5">{children}</div>
    </div>
  );
}
