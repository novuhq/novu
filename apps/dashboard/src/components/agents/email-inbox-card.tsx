import { type IIntegration } from '@novu/shared';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  RiAlertFill,
  RiArrowRightSLine,
  RiExpandUpDownLine,
  RiFileCopyLine,
  RiInformation2Line,
} from 'react-icons/ri';
import { Link } from 'react-router-dom';
import type { AgentResponse } from '@/api/agents';
import { InputPure, InputRoot, InputWrapper } from '@/components/primitives/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/primitives/popover';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Switch } from '@/components/primitives/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useEnvironment } from '@/context/environment/hooks';
import { useUpdateIntegration } from '@/hooks/use-update-integration';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';

/**
 * Lowercase letters, digits, dashes; 1-32 chars; no leading/trailing dash.
 * Mirrors the server-side validation in
 * `libs/application-generic/src/dtos/credentials.dto.ts`.
 */
const EMAIL_SLUG_PREFIX_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

export type EmailInboxCardProps = {
  agent: AgentResponse;
  emailIntegration: IIntegration;
};

/**
 * The EMAIL INBOX card on the agent overview page (Figma node `7031:315278`).
 *
 * Three sections:
 *
 *  1. Master toggle - bound to `integration.active` via `useUpdateIntegration`.
 *     When off, the worker drops inbound mail to the shared address and outbound
 *     sends throw.
 *  2. Inbound address - editable slug prefix bound to
 *     `integration.credentials.emailSlugPrefix`. Domain dropdown defaults to the
 *     shared agent domain (e.g. `agentconnect.sh`) and links out to the Domains
 *     settings for custom domains.
 *  3. Demo provider note - visible only while the agent has no user-attached
 *     outbound provider (`credentials.outboundIntegrationId` unset). Linkifies
 *     directly into the existing outbound provider picker.
 */
export function EmailInboxCard({ agent, emailIntegration }: EmailInboxCardProps) {
  const { currentEnvironment } = useEnvironment();
  const { mutateAsync: updateIntegration } = useUpdateIntegration();

  const serverCredentials = emailIntegration.credentials ?? {};
  const serverSlug = typeof serverCredentials.emailSlugPrefix === 'string' ? serverCredentials.emailSlugPrefix : '';
  const serverOutboundId =
    typeof serverCredentials.outboundIntegrationId === 'string' ? serverCredentials.outboundIntegrationId : '';

  const [slug, setSlug] = useState(serverSlug);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const credentialsRef = useRef<Record<string, unknown>>(serverCredentials as Record<string, unknown>);

  useEffect(() => {
    credentialsRef.current = serverCredentials as Record<string, unknown>;
    setSlug((current) => (current === '' ? serverSlug : current));
  }, [serverCredentials, serverSlug]);

  const enabled = emailIntegration.active !== false;
  const showDemoNote = !serverOutboundId;
  const defaultInboundAddress = agent.defaultInboundAddress;
  const defaultDomain = agent.defaultDomain;
  const domainsPath = currentEnvironment?.slug
    ? buildRoute(ROUTES.DOMAINS, { environmentSlug: currentEnvironment.slug })
    : ROUTES.INTEGRATIONS;

  const sectionTwoDisabled = !enabled;

  async function persistCredentials(patch: Record<string, unknown>): Promise<void> {
    const merged = { ...credentialsRef.current, ...patch };
    credentialsRef.current = merged;

    await updateIntegration({
      integrationId: emailIntegration._id,
      data: {
        name: emailIntegration.name,
        identifier: emailIntegration.identifier,
        active: emailIntegration.active,
        primary: emailIntegration.primary ?? false,
        credentials: merged,
        configurations: {},
        check: false,
      },
    });
  }

  async function persistActive(nextActive: boolean): Promise<void> {
    await updateIntegration({
      integrationId: emailIntegration._id,
      data: {
        name: emailIntegration.name,
        identifier: emailIntegration.identifier,
        active: nextActive,
        primary: emailIntegration.primary ?? false,
        credentials: credentialsRef.current,
        configurations: {},
        check: false,
      },
    });
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

  async function handleSlugBlur() {
    const trimmed = slug.trim().toLowerCase();
    if (!trimmed) {
      setSlugError('Slug cannot be empty');

      return;
    }
    if (trimmed === serverSlug) {
      setSlugError(null);

      return;
    }
    if (!EMAIL_SLUG_PREFIX_RE.test(trimmed)) {
      setSlugError('1-32 lowercase letters, digits, or dashes (no leading/trailing dash)');

      return;
    }
    setSlugError(null);
    try {
      await persistCredentials({ emailSlugPrefix: trimmed });
      setSlug(trimmed);
    } catch (err) {
      setSlug(serverSlug);
      const message = err instanceof Error ? err.message : 'Could not save inbox address.';
      showErrorToast(message, 'Settings not saved');
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
        <CardRow
          title="Enable email inbox"
          description="Let users reach this agent via email."
          divider
        >
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
              <InputRoot size="xs" className="max-w-[120px]" hasError={Boolean(slugError)}>
                <InputWrapper>
                  <InputPure
                    value={slug}
                    onChange={(event) => setSlug(event.target.value.toLowerCase())}
                    onBlur={() => {
                      void handleSlugBlur();
                    }}
                    disabled={sectionTwoDisabled}
                    aria-label="Email inbox slug prefix"
                    className="font-mono text-[12px]"
                    spellCheck={false}
                  />
                </InputWrapper>
              </InputRoot>

              <DomainSelect
                sharedDomain={defaultDomain ?? ''}
                disabled={sectionTwoDisabled}
                onSelectCustom={domainsPath}
              />
            </div>

            {slugError ? (
              <p className="text-error-base text-paragraph-xs">{slugError}</p>
            ) : null}

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
          <div className="text-text-soft text-paragraph-xs px-1 pb-1">
            Default
          </div>
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
          <span className="text-text-strong font-medium">Note:</span>{' '}
          Agent uses{' '}
          <NovuEmailDemoBadge />{' '}
          to send. The demo integration is intended for testing purposes only and recommended to add a provider for
          uninterrupted delivery at scale.
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
      <span className="bg-away-lighter text-away-base rounded px-1 py-px text-[11px] font-medium uppercase">
        Demo
      </span>
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
