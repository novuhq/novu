import { ChatProviderIdEnum, FeatureFlagsKeysEnum, type ICredentials } from '@novu/shared';
import { type ReactNode, useId, useMemo } from 'react';
import { RiArrowRightSLine, RiArrowRightUpLine, RiCheckLine, RiInformationLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { ConnectionConfetti } from '@/components/agents/connection-confetti';
import { isAgentIntegrationConnected } from '@/components/agents/is-agent-integration-connected';
import { CopyButton } from '@/components/primitives/copy-button';
import { Input } from '@/components/primitives/input';
import { SecretInput } from '@/components/primitives/secret-input';
import { Skeleton } from '@/components/primitives/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { API_HOSTNAME } from '@/config';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { AgentIntegrationGuideHeader } from './agent-integration-guide-layout';
import { AgentChannelWhatsNextGuide } from './whats-next/agent-channel-whats-next-guide';

type SlackAgentConnectedDetailsProps = {
  agent: AgentResponse;
  integrationLink: AgentIntegrationLink;
  canRemoveIntegration: boolean;
  onRequestRemoveIntegration?: () => void;
  isRemovingIntegration?: boolean;
  /**
   * True when the integration connected during this session and we just transitioned in from the
   * setup guide — drives the one-shot celebration so the "success" moment carries over instead of
   * being dropped when the setup card animates away.
   */
  justConnected?: boolean;
};

const MANAGE_SLACK_APP_BASE_URL = 'https://api.slack.com/apps';

function buildWebhookUrl(agentId: string, integrationIdentifier: string): string {
  const baseUrl = (API_HOSTNAME ?? 'https://api.novu.co').replace(/\/$/, '');

  return `${baseUrl}/v1/agents/${agentId}/webhook/${integrationIdentifier}`;
}

function FieldLabel({
  htmlFor,
  label,
  required,
  info,
}: {
  htmlFor: string;
  label: string;
  required?: boolean;
  info?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="text-text-sub text-label-xs flex items-center gap-1 font-medium leading-5">
      <span>{label}</span>
      {required ? <span className="text-error-base">*</span> : null}
      {info ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-text-soft inline-flex cursor-help items-center">
              <RiInformationLine className="size-3.5" aria-hidden />
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{info}</TooltipContent>
        </Tooltip>
      ) : null}
    </label>
  );
}

function ReadOnlyField({
  label,
  value,
  required,
  info,
  secret,
  copyable,
  mono = true,
}: {
  label: string;
  value: string;
  required?: boolean;
  info?: string;
  secret?: boolean;
  copyable?: boolean;
  mono?: boolean;
}) {
  const fieldId = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={fieldId} label={label} required={required} info={info} />
      {secret ? (
        <SecretInput id={fieldId} value={value} onChange={() => {}} readOnly size="2xs" className="font-mono" />
      ) : (
        <Input
          id={fieldId}
          value={value}
          readOnly
          size="2xs"
          className={cn(mono && 'font-mono')}
          trailingNode={copyable && value ? <CopyButton valueToCopy={value} className="p-1" size="2xs" /> : null}
        />
      )}
    </div>
  );
}

function FieldSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full rounded-10" />
    </div>
  );
}

function DetailSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[10px] bg-bg-weak flex flex-col p-1">
      <div className="flex items-center justify-between gap-2 py-2 px-1">
        <h3 className="text-text-soft text-code-xs font-normal uppercase tracking-wider">{title}</h3>
        {action}
      </div>
      <div className="bg-bg-white flex flex-col gap-5 overflow-hidden rounded-md shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)] p-4">
        {children}
      </div>
    </section>
  );
}

function SectionLinkButton({
  icon: Icon,
  iconPosition = 'trailing',
  children,
  onClick,
  href,
}: {
  icon: typeof RiArrowRightUpLine;
  iconPosition?: 'leading' | 'trailing';
  children: ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const content = (
    <>
      {iconPosition === 'leading' ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
      <span>{children}</span>
      {iconPosition === 'trailing' ? <Icon className="size-3 shrink-0" aria-hidden /> : null}
    </>
  );

  const className =
    'text-text-sub hover:text-text-strong text-label-xs inline-flex items-center gap-1 font-medium leading-4 transition-colors';

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

export function SlackAgentConnectedDetails({
  agent,
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
  justConnected = false,
}: SlackAgentConnectedDetailsProps) {
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const isWhatsNextEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_AGENT_WHATS_NEXT_ENABLED);
  const { integrations, isLoading } = useFetchIntegrations();

  const integration = useMemo(
    () => integrations?.find((item) => item._id === integrationLink.integration._id),
    [integrations, integrationLink.integration._id]
  );

  const isConnected = isAgentIntegrationConnected(integrationLink);
  const credentials = integration?.credentials;
  const applicationId = (credentials?.applicationId as string | undefined) ?? '';
  const slackAppName = integration?.name ?? integrationLink.integration.name;
  const webhookUrl = buildWebhookUrl(agent._id, integrationLink.integration.identifier);

  const manageSlackAppUrl = applicationId ? `${MANAGE_SLACK_APP_BASE_URL}/${applicationId}` : MANAGE_SLACK_APP_BASE_URL;

  const viewActivityHref = useMemo(() => {
    if (!currentEnvironment?.slug) return undefined;

    const path = buildRoute(ROUTES.ACTIVITY_CONVERSATIONS, { environmentSlug: currentEnvironment.slug });

    return `${path}?agentId=${encodeURIComponent(agent.identifier)}`;
  }, [agent.identifier, currentEnvironment?.slug]);

  const handleViewActivity = () => {
    if (viewActivityHref) {
      void navigate(viewActivityHref);
    }
  };

  const credentialFields = useMemo(
    () => [
      { key: 'applicationId' as keyof ICredentials, label: 'App ID', value: applicationId, secret: false },
      {
        key: 'clientId' as keyof ICredentials,
        label: 'Client ID',
        value: (credentials?.clientId as string | undefined) ?? '',
        secret: false,
      },
      {
        key: 'secretKey' as keyof ICredentials,
        label: 'Client Secret',
        value: (credentials?.secretKey as string | undefined) ?? '',
        secret: true,
      },
      {
        key: 'signingSecret' as keyof ICredentials,
        label: 'Signing Secret',
        value: (credentials?.signingSecret as string | undefined) ?? '',
        secret: true,
      },
    ],
    [applicationId, credentials?.clientId, credentials?.secretKey, credentials?.signingSecret]
  );

  return (
    <div className="flex w-full max-w-[1100px] flex-col gap-4">
      <ConnectionConfetti active={justConnected} />
      <AgentIntegrationGuideHeader
        providerId={ChatProviderIdEnum.Slack}
        providerDisplayName="Slack"
        integrationLink={integrationLink}
        canRemoveIntegration={canRemoveIntegration}
        onRequestRemoveIntegration={onRequestRemoveIntegration}
        isRemovingIntegration={isRemovingIntegration}
      />

      <div
        className={cn(
          'border-stroke-soft bg-bg-weak/30 flex items-center justify-between gap-3 rounded-lg border px-3 py-2',
          isConnected ? 'border-l-success-base border-l-2' : 'border-l-warning-base border-l-2'
        )}
      >
        <div className="text-text-sub text-label-xs flex min-w-0 items-center gap-1.5 leading-4">
          <RiCheckLine className={cn('size-4 shrink-0', isConnected ? 'text-success-base' : 'text-warning-base')} />
          <span className="text-text-strong font-medium">{isConnected ? 'Connected' : 'Action needed'}</span>
        </div>
        {viewActivityHref ? (
          <SectionLinkButton icon={RiArrowRightSLine} onClick={handleViewActivity}>
            View activity
          </SectionLinkButton>
        ) : null}
      </div>

      {isWhatsNextEnabled ? (
        <AgentChannelWhatsNextGuide
          agent={agent}
          integrationLink={integrationLink}
          credentials={credentials}
          applicationIdentifier={currentEnvironment?.identifier}
        />
      ) : null}

      <DetailSection
        title="Slack app metadata"
        action={
          <SectionLinkButton icon={RiArrowRightUpLine} href={manageSlackAppUrl}>
            Manage Slack App
          </SectionLinkButton>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ReadOnlyField
            label="Slack app name"
            value={slackAppName}
            mono={false}
            info="The display name of your connected Slack app."
          />
          {isLoading ? (
            <FieldSkeleton />
          ) : (
            <ReadOnlyField label="Slack app ID" value={applicationId} info="The unique identifier of your Slack app." />
          )}
        </div>
        <ReadOnlyField
          label="Webhook URL"
          value={webhookUrl}
          copyable
          info="Point your Slack app's Event Subscriptions and Interactivity request URLs at this endpoint. It receives Slack events for this agent."
        />
      </DetailSection>

      <DetailSection title="Slack credentials">
        {isLoading ? (
          <>
            <FieldSkeleton />
            <FieldSkeleton />
            <FieldSkeleton />
            <FieldSkeleton />
          </>
        ) : (
          credentialFields.map((field) => (
            <ReadOnlyField key={field.key} label={field.label} value={field.value} required secret={field.secret} />
          ))
        )}
      </DetailSection>
    </div>
  );
}
