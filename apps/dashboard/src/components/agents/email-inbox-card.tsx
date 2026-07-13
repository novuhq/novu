import { ApiServiceLevelEnum, FeatureNameEnum, getFeatureForTierAsBoolean, type IIntegration } from '@novu/shared';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { RiAddLine, RiArrowRightSLine, RiArrowRightUpLine, RiCloseLine } from 'react-icons/ri';
import { Link, useSearchParams } from 'react-router-dom';
import type { AgentIntegrationEmbedded, AgentResponse } from '@/api/agents';
import { AgentInboxCardRow, AgentInboxCardRowInfoTitle } from '@/components/agents/agent-inbox-card-row';
import { CopyableEmailAddress } from '@/components/agents/copyable-email-address';
import { EmailSubscriberAccessToggle } from '@/components/agents/email-subscriber-access-toggle';
import { CompactButton } from '@/components/primitives/button-compact';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { Switch } from '@/components/primitives/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { UpgradeCTATooltip } from '@/components/upgrade-cta-tooltip';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { useUpdateIntegration } from '@/hooks/use-update-integration';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { getMinimumTierForFeature } from '@/utils/upgrade-tier';
import { AgentCustomDomainSheet } from './agent-custom-domain-sheet';
import { useEmailSetupCredentials } from './use-email-setup-credentials';

const CREATE_SUBSCRIBER_DOCS_URL = 'https://docs.novu.co/api-reference/subscribers/create-a-subscriber';

const quietLinkClassName =
  'text-text-sub hover:text-text-strong inline-flex items-center gap-0.5 text-label-xs font-medium leading-4 transition-colors';

const connectDomainButtonClassName = cn(
  quietLinkClassName,
  'self-start py-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-text-sub'
);

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
 * a "primary" address; every listed address routes inbound. The "+ Connect
 * custom domain" affordance reveals the add-form on demand instead of always
 * occupying screen real estate.
 */
export function EmailInboxCardBody({
  emailIntegration,
  integrationEmbedded,
  agent,
  hideCustomAddressForm = false,
}: EmailInboxCardProps) {
  const { currentEnvironment } = useEnvironment();
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

  const inboundAddressesInfoTooltip =
    'Share an address anywhere users reach you: contact forms, reply flows, support footers, or docs. All listed addresses route inbound. There is no primary.';

  const subscriberAccessInfoTooltip =
    "With Open, a lightweight subscriber is created from the sender's address so the agent can reply. It merges into their account if they later sign up with the same email.";

  function handleSharedToggle(nextEnabled: boolean) {
    // Disabling is only safe when at least one custom-domain address remains
    // so the agent isn't left with zero inbound paths.
    if (!nextEnabled && !hasCustomAddresses) {
      showErrorToast(
        'Connect a custom domain first: the agent must keep at least one inbound address.',
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

  const subscribersPath = currentEnvironment?.slug
    ? buildRoute(ROUTES.SUBSCRIBERS, { environmentSlug: currentEnvironment.slug })
    : ROUTES.SUBSCRIBERS;

  return (
    <>
      <AgentInboxCardRow title="Enable email inbox" description="Let users reach this agent via email." divider>
        <div className="flex justify-end">
          <Switch checked={enabled} disabled={isToggling} onCheckedChange={handleToggle} />
        </div>
      </AgentInboxCardRow>

      <AgentInboxCardRow
        title={<AgentInboxCardRowInfoTitle label="Inbound addresses" infoTooltip={inboundAddressesInfoTooltip} />}
        description="Mail sent to any of these addresses is delivered to this agent."
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
                description="Connect a custom domain to receive email on your own domain."
                requiredTier={getMinimumTierForFeature(FeatureNameEnum.DOMAINS_BOOLEAN)}
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
        </div>
      </AgentInboxCardRow>

      <AgentInboxCardRow
        title={
          <AgentInboxCardRowInfoTitle label="Who can email this agent" infoTooltip={subscriberAccessInfoTooltip} />
        }
        description="Open accepts email from anyone. Off replies only to known subscribers."
        divider
        footer={
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
        }
      >
        <div className="flex items-center justify-end gap-2">
          <span className="text-text-soft text-label-xs font-medium leading-4">Accept email from anyone</span>
          <EmailSubscriberAccessToggle agent={agent} ariaLabel="Accept email from anyone" />
        </div>
      </AgentInboxCardRow>

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
 * Address row: the pill stays a compact copy target (address + copy button
 * only) while controls (badge, remove, toggle) live outside it, right-aligned
 * so they form a consistent column across rows.
 */
function InboxRow({ address, badge, trailing }: InboxRowProps) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2">
      <CopyableEmailAddress email={address} className="min-w-0" />
      {badge || trailing ? (
        <div className="flex shrink-0 items-center gap-1.5">
          {badge ? (
            <span className="text-text-soft text-[10px] font-medium uppercase leading-3 tracking-wide">{badge}</span>
          ) : null}
          {trailing}
        </div>
      ) : null}
    </div>
  );
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
 * enabled even when the user has flipped the switch off. Only the toggle's
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

  const rowContent = <InboxRow address={address} trailing={switchControl} />;

  if (!disabled) {
    return rowContent;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{rowContent}</TooltipTrigger>
      <TooltipContent className="max-w-xs">
        Shared inbox is off: mail to this address is dropped. Flip the switch to re-enable it.
      </TooltipContent>
    </Tooltip>
  );
}
