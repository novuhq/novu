import { type IIntegration } from '@novu/shared';
import { type ReactNode, useMemo, useRef, useState } from 'react';
import { RiAlertFill, RiArrowRightSLine, RiInformation2Line } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { CopyButton } from '@/components/primitives/copy-button';
import { Input } from '@/components/primitives/input';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
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
};

/**
 * Inbound Novu email settings: enable inbox, inbound address + copy, optional
 * demo-provider note. Renders as rows only — wrap in `EmailAgentIntegrationGuide`
 * merged shell or a standalone card shell.
 */
export function EmailInboxCardBody({ emailIntegration, defaultInboundAddress }: EmailInboxCardProps) {
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
  const inboxAddressValue = defaultInboundAddress ?? '';

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
      defaultInboundAddress
        ? `Inbound mail sent to ${defaultInboundAddress} is delivered to this agent.`
        : 'Replies and incoming mail to this address are delivered to the agent.',
    [defaultInboundAddress]
  );

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
          <Input
            size="2xs"
            value={inboxAddressValue}
            readOnly
            disabled={sectionTwoDisabled}
            placeholder="Provisioning…"
            aria-label="Agent inbound email address"
            className={cn('cursor-default font-mono text-text-sub!', !defaultInboundAddress && 'text-text-soft!')}
            title={defaultInboundAddress}
            trailingNode={<CopyButton size="2xs" valueToCopy={inboxAddressValue} className="size-7 justify-center" />}
          />

          <div className="flex items-center pt-1">
            <Link
              to={domainsPath}
              className="text-text-sub hover:text-text-strong inline-flex items-center gap-0.5 text-label-xs font-medium leading-4 transition-colors"
            >
              <span>Add custom domain</span>
              <RiArrowRightSLine className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </CardRow>

      {showDemoNote ? <DemoProviderNote /> : null}
    </>
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
