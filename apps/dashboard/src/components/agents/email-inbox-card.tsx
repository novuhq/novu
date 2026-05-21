import { DomainStatusEnum, type IIntegration } from '@novu/shared';
import { type ReactNode, useMemo, useRef, useState } from 'react';
import { RiAddLine, RiCloseLine, RiInformation2Line } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import type { AgentIntegrationEmbedded, AgentResponse } from '@/api/agents';
import { CompactButton } from '@/components/primitives/button-compact';
import { CopyButton } from '@/components/primitives/copy-button';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { Switch } from '@/components/primitives/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useUpdateIntegration } from '@/hooks/use-update-integration';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { InboundAddressForm } from './inbound-address-form';
import { useEmailSetupCredentials } from './use-email-setup-credentials';

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
};

/**
 * Post-setup inbox manager: lists the agent's inbound addresses (Novu shared
 * inbox + each custom-domain `DomainRouteTypeEnum.AGENT` route) and lets the
 * user disable the shared inbox or remove a custom one. There is no notion of
 * a "primary" address — every listed address routes inbound. The "+ Connect
 * custom domain" affordance reveals the add-form on demand instead of always
 * occupying screen real estate.
 */
export function EmailInboxCardBody({ emailIntegration, integrationEmbedded, agent }: EmailInboxCardProps) {
  const { currentEnvironment } = useEnvironment();
  const { mutateAsync: updateIntegration } = useUpdateIntegration();
  const { integrations } = useFetchIntegrations();

  const { configuredAddresses, domains, addAddress, removeAddress, setSharedInboxDisabled, isSharedToggleUpdating } =
    useEmailSetupCredentials({ emailIntegration, integrations, agent });

  const serverCredentials = emailIntegration.credentials ?? {};
  const [isToggling, setIsToggling] = useState(false);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const activeRef = useRef(emailIntegration.active !== false);

  const enabled = emailIntegration.active !== false;
  const inboxSectionDisabled = !enabled;
  const domainsPath = currentEnvironment?.slug
    ? buildRoute(ROUTES.DOMAINS, { environmentSlug: currentEnvironment.slug })
    : ROUTES.INTEGRATIONS;

  const sharedAddress = integrationEmbedded.sharedInboundAddress;
  const sharedDisabled = Boolean(integrationEmbedded.sharedInboxDisabled);
  const hasCustomAddresses = configuredAddresses.length > 0;
  // Mirror the verified-domain filter the add-form applies so the affordance
  // and the picker stay in sync: no point offering "Connect custom domain"
  // when the picker would open empty. When no usable domains exist, the
  // discoverability tip below points the user at the domain-management page.
  const hasUsableDomains = useMemo(
    () => domains.some((d) => d.status === DomainStatusEnum.VERIFIED && d.mxRecordConfigured),
    [domains]
  );

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

  function handleAddAddress(address: string, domain: (typeof domains)[number]): boolean {
    addAddress(address, domain);
    setIsAddingCustom(false);

    return true;
  }

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
        description="Users can reach this agent at any of the addresses below. Mail delivered to any of them is forwarded to the agent."
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

          {isAddingCustom && hasUsableDomains ? (
            <div className="flex flex-col gap-1.5">
              <InboundAddressForm
                domains={domains}
                isDisabled={inboxSectionDisabled}
                onSubmit={handleAddAddress}
                isExistingAddress={(address, domainId) =>
                  configuredAddresses.some((a) => a.address === address && a.domainId === domainId)
                }
              />
              <button
                type="button"
                className="text-text-soft hover:text-text-sub text-label-xs self-start font-medium transition-colors"
                onClick={() => setIsAddingCustom(false)}
              >
                Cancel
              </button>
            </div>
          ) : null}

          {!isAddingCustom && hasUsableDomains ? (
            <button
              type="button"
              disabled={inboxSectionDisabled}
              onClick={() => setIsAddingCustom(true)}
              className="text-text-sub hover:text-text-strong inline-flex items-center gap-0.5 self-start py-1 text-label-xs font-medium leading-4 transition-colors disabled:opacity-50"
            >
              <RiAddLine className="size-3.5" aria-hidden />
              <span>Connect custom domain</span>
            </button>
          ) : null}

          {hasCustomAddresses ? null : (
            <p className="text-text-soft text-paragraph-xs leading-4">
              <span aria-hidden>💡</span> Tip:{' '}
              <Link to={domainsPath} className="text-text-sub underline underline-offset-2">
                Configure custom domains
              </Link>{' '}
              in Novu to make them available here.
            </p>
          )}
        </div>
      </CardRow>
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
function InboxRow({ address, badge, trailing }: InboxRowProps) {
  return (
    <div className="bg-bg-weak/40 hover:bg-bg-weak flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors">
      <span className="text-text-sub text-label-xs min-w-0 flex-1 truncate font-mono leading-4">{address}</span>
      {badge ? (
        <span className="text-text-soft text-[10px] font-medium uppercase leading-3 tracking-wide">{badge}</span>
      ) : null}
      <CopyButton size="2xs" valueToCopy={address} className="size-6 shrink-0 justify-center" />
      {trailing}
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
 * enabled even when the user has flipped the switch off — only the toggle's
 * off-state signals the disabled status. Hovering anywhere on the row body
 * surfaces a tooltip explaining what "off" means (drops inbound mail to the
 * shared `agentconnect.sh` address while keeping custom-domain routes
 * intact), avoiding the "this row looks broken" impression that a faded body
 * gives.
 */
function SharedInboxRow({ address, disabled, toggleDisabled, toggleTooltip, onToggle }: SharedInboxRowProps) {
  const rowContent = (
    <div className="bg-bg-weak/40 hover:bg-bg-weak flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors">
      <span className="text-text-sub text-label-xs min-w-0 flex-1 truncate font-mono leading-4">{address}</span>
      <CopyButton size="2xs" valueToCopy={address} className="size-6 shrink-0 justify-center" />
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Switch
              aria-label={disabled ? 'Enable the shared inbox' : 'Disable the shared inbox'}
              checked={!disabled}
              onCheckedChange={onToggle}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{toggleTooltip}</TooltipContent>
      </Tooltip>
    </div>
  );

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
