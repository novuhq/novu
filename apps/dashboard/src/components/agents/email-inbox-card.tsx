import { type IIntegration } from '@novu/shared';
import { type ReactNode, useMemo, useRef, useState } from 'react';
import { RiAlertFill, RiArrowRightSLine, RiExpandUpDownLine, RiFileCopyLine, RiInformation2Line } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Switch } from '@/components/primitives/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useEnvironment } from '@/context/environment/hooks';
import { useUpdateIntegration } from '@/hooks/use-update-integration';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';

export type EmailInboxCardProps = {
  emailIntegration: IIntegration;
  /**
   * Pre-computed shared inbox address (`{slug}-{agentId}@<shared-domain>`).
   * Sourced from the agent–integration link response so the UI doesn't have
   * to know the routing-key composition or the shared domain.
   */
  defaultInboundAddress?: string;
  /** Cloud-only shared inbound domain hosting the inbox (e.g. `agentconnect.sh`). */
  defaultDomain?: string;
};

/**
 * The EMAIL INBOX card on the agent overview page (Figma node `7031:315278`).
 *
 * Three sections:
 *
 *  1. Master toggle - bound to `integration.active` via `useUpdateIntegration`.
 *     When off, the worker drops inbound mail to the shared address and outbound
 *     sends throw.
 *  2. Inbound address - read-only display of the auto-provisioned address
 *     (`{emailSlugPrefix}-{agentId}@<shared-domain>`). The local part embeds
 *     the agent id as a routing key, so we render the whole value statically
 *     to match what the "Copy address" button puts on the clipboard.
 *  3. Demo provider note - visible only while the agent has no user-attached
 *     outbound provider (`credentials.outboundIntegrationId` unset). Linkifies
 *     directly into the existing outbound provider picker.
 */
export function EmailInboxCard({ emailIntegration, defaultInboundAddress, defaultDomain }: EmailInboxCardProps) {
  const { currentEnvironment } = useEnvironment();
  const { mutateAsync: updateIntegration } = useUpdateIntegration();

  const serverCredentials = emailIntegration.credentials ?? {};
  const serverOutboundId =
    typeof serverCredentials.outboundIntegrationId === 'string' ? serverCredentials.outboundIntegrationId : '';

  const [isToggling, setIsToggling] = useState(false);
  const activeRef = useRef(emailIntegration.active !== false);

  const enabled = emailIntegration.active !== false;
  const showDemoNote = !serverOutboundId;
  const domainsPath = currentEnvironment?.slug
    ? buildRoute(ROUTES.DOMAINS, { environmentSlug: currentEnvironment.slug })
    : ROUTES.INTEGRATIONS;

  const sectionTwoDisabled = !enabled;

  /**
   * Local part of the inbox address, e.g. `asd-dddddd-6a08bc0bc52e2d385af58887`.
   * Falls back to `undefined` when the address hasn't been provisioned yet so
   * we can show a neutral placeholder rather than rendering "undefined".
   */
  const inboxLocalPart = useMemo(() => {
    if (!defaultInboundAddress) return undefined;
    const atIndex = defaultInboundAddress.lastIndexOf('@');

    return atIndex >= 0 ? defaultInboundAddress.slice(0, atIndex) : defaultInboundAddress;
  }, [defaultInboundAddress]);

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

  function handleCopyAddress() {
    if (!defaultInboundAddress) return;
    navigator.clipboard
      .writeText(defaultInboundAddress)
      .then(() => showSuccessToast('Address copied to clipboard.'))
      .catch(() => showErrorToast('Could not copy address to clipboard.', 'Copy failed'));
  }

  const tooltipCopy = useMemo(
    () =>
      defaultInboundAddress
        ? `Inbound mail sent to ${defaultInboundAddress} is delivered to this agent.`
        : 'Replies and incoming mail to this address are delivered to the agent.',
    [defaultInboundAddress]
  );

  return (
    <div className="bg-bg-weak flex flex-col rounded-[10px] p-1">
      <SectionHeader>EMAIL INBOX</SectionHeader>

      <div className="bg-bg-white flex flex-col overflow-hidden rounded-md shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
        <CardRow title="Enable email inbox" description="Let users reach this agent via email." divider>
          <div className="flex justify-end">
            <Switch checked={enabled} disabled={isToggling} onCheckedChange={handleToggle} />
          </div>
        </CardRow>

        <CardRow
          title={
            <span className="flex items-center gap-1">
              Inbound email to receive emails
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
          description="Users can email this address to talk to your agent."
          tip={
            <>
              <span aria-hidden>💡</span> Tip: Configure{' '}
              <Link to={domainsPath} className="text-text-sub underline underline-offset-2">
                custom domains
              </Link>{' '}
              for custom agent address.
            </>
          }
          divider
          disabled={sectionTwoDisabled}
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-1.5">
              <StaticInboxLocalPart value={inboxLocalPart} disabled={sectionTwoDisabled} />

              <DomainSelect
                sharedDomain={defaultDomain ?? ''}
                disabled={sectionTwoDisabled}
                onSelectCustom={domainsPath}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <Link
                to={domainsPath}
                className="text-text-sub hover:text-text-strong inline-flex items-center gap-0.5 text-label-xs font-medium leading-4 transition-colors"
              >
                <span>Add custom domain</span>
                <RiArrowRightSLine className="size-4" aria-hidden />
              </Link>

              <button
                type="button"
                onClick={handleCopyAddress}
                disabled={!defaultInboundAddress || sectionTwoDisabled}
                className="text-text-sub hover:text-text-strong inline-flex items-center gap-1 text-label-xs font-medium leading-4 transition-colors disabled:opacity-50"
              >
                <RiFileCopyLine className="size-3.5" aria-hidden />
                <span>Copy address</span>
              </button>
            </div>
          </div>
        </CardRow>

        {showDemoNote ? <DemoProviderNote /> : null}
      </div>
    </div>
  );
}

/**
 * Read-only display of the inbox local-part (everything before the `@`).
 * The full address embeds the agent id as a routing key, so making it
 * editable here would be misleading — users would expect to be able to
 * change the entire local part but only `emailSlugPrefix` is configurable.
 * Showing it as static text matches the value that "Copy address" puts on
 * the clipboard.
 */
function StaticInboxLocalPart({ value, disabled }: { value: string | undefined; disabled: boolean }) {
  return (
    <div
      className={cn(
        'bg-bg-weak border-stroke-soft text-text-sub flex h-7 min-w-0 flex-1 items-center overflow-hidden rounded-md border px-2 py-1.5 shadow-xs',
        'font-mono text-[12px] leading-4 tracking-tight',
        disabled && 'opacity-50'
      )}
      title={value}
    >
      <span className="truncate">{value ?? 'Provisioning…'}</span>
    </div>
  );
}

/**
 * Domain dropdown shown in section 2. For v1 we list only the shared agent
 * domain plus a "Manage custom domains" link out to the Domains settings page.
 * Selecting a custom domain happens via the existing inbound-address-config
 * flow on the legacy email setup page; we don't duplicate that picker here.
 */
function DomainSelect({
  sharedDomain,
  disabled,
  onSelectCustom,
}: {
  sharedDomain: string;
  disabled: boolean;
  onSelectCustom: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'bg-bg-weak border-stroke-soft text-text-sub flex h-7 flex-1 items-center justify-between gap-2 overflow-hidden rounded-md border px-2 py-1.5 shadow-xs',
            'font-mono text-[12px] leading-4 tracking-tight',
            'disabled:opacity-50'
          )}
        >
          <span className="truncate">{sharedDomain || 'No shared domain configured'}</span>
          <RiExpandUpDownLine className="text-text-soft size-3" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[280px] p-2">
        <div className="flex flex-col gap-1">
          <div className="text-text-soft text-paragraph-xs px-1 pb-1">Default</div>
          <div className="text-text-sub bg-bg-weak rounded px-2 py-1.5 font-mono text-[12px]">
            {sharedDomain || '(unavailable)'}
          </div>
          <div className="border-stroke-weak my-1 border-t" />
          <Link
            to={onSelectCustom}
            onClick={() => setOpen(false)}
            className="text-text-sub hover:bg-bg-weak rounded px-2 py-1.5 text-label-xs"
          >
            Manage custom domains
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DemoProviderNote() {
  return (
    <div className="p-3">
      <div className="bg-bg-weak border-stroke-weak relative flex items-stretch gap-3 overflow-hidden rounded-lg border px-3 py-2.5">
        <div className="bg-warning-base w-1 shrink-0 rounded-full" aria-hidden />
        <div className="text-text-sub text-paragraph-xs flex-1 leading-4">
          <span className="text-text-strong font-medium">Note:</span> Agent uses <NovuEmailDemoBadge /> to send. The
          demo integration is intended for testing purposes only and recommended to add a provider for uninterrupted
          delivery at scale.
        </div>
        <Link
          to={ROUTES.INTEGRATIONS}
          className="text-text-strong hover:text-text-soft inline-flex shrink-0 items-center gap-1 self-start text-label-xs font-medium"
        >
          <RiAlertFill className="text-warning-base size-4" aria-hidden />
          <span>Add Email provider</span>
          <RiArrowRightSLine className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

function NovuEmailDemoBadge() {
  return (
    <span className="bg-bg-weak text-text-sub inline-flex items-center gap-1 align-middle">
      <span className="bg-primary-base inline-block size-3.5 rounded-sm" aria-hidden />
      <span>Novu Email</span>
      <span className="bg-away-lighter text-away-base rounded px-1 py-px text-[11px] font-medium uppercase">Demo</span>
    </span>
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
  tip,
  children,
  divider,
  disabled,
}: {
  title: ReactNode;
  description: ReactNode;
  tip?: ReactNode;
  children: ReactNode;
  divider?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 p-3',
        divider && 'border-stroke-weak border-b',
        disabled && 'opacity-60'
      )}
    >
      <div className="flex min-w-0 max-w-[350px] flex-1 flex-col gap-1">
        <div className="text-text-sub text-label-sm font-medium leading-5">{title}</div>
        <p className="text-text-soft text-paragraph-xs leading-4">{description}</p>
        {tip ? <p className="text-text-soft text-paragraph-xs pt-1 leading-4">{tip}</p> : null}
      </div>
      <div className="flex w-[340px] shrink-0 flex-col gap-1.5">{children}</div>
    </div>
  );
}
