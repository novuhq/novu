import { ChatProviderIdEnum } from '@novu/shared';
import { Loader } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useState } from 'react';
import { RiArrowDownSLine, RiArrowRightUpLine, RiExpandUpDownLine } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { Button } from '@/components/primitives/button';
import { CodeBlock } from '@/components/primitives/code-block';
import { ExternalLink } from '@/components/shared/external-link';
import { API_HOSTNAME } from '@/config';
import { cn } from '@/utils/ui';

type AgentSetupGuideProps = {
  agent: AgentResponse;
};

type StepStatus = 'completed' | 'current' | 'upcoming';

function StepIndicator({ status, index }: { status: StepStatus; index: number }) {
  if (status === 'completed') {
    return (
      <div className="flex size-5 shrink-0 items-center justify-center rounded-full border border-[#5ec269] bg-[#77db89] shadow-[0px_0px_0px_1px_#FFF,0px_0px_0px_2px_#E1E4EA]">
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  return (
    <div className="bg-bg-weak text-text-strong flex size-5 shrink-0 items-center justify-center rounded-full text-[12px] font-medium leading-[10px] shadow-[0px_0px_0px_1px_#FFF,0px_0px_0px_2px_#E1E4EA]">
      {index}
    </div>
  );
}

function SetupStep({
  index,
  status,
  sectionLabel,
  title,
  description,
  rightContent,
  extraContent,
}: {
  index: number;
  status: StepStatus;
  sectionLabel?: string;
  title: string;
  description: ReactNode;
  rightContent?: ReactNode;
  extraContent?: ReactNode;
}) {
  return (
    <div className="relative flex gap-5 pl-6">
      <div className={cn('absolute -left-[20px] flex w-5 justify-center', sectionLabel ? 'top-5' : 'top-0')}>
        <StepIndicator status={status} index={index} />
      </div>
      <div className="flex w-[400px] shrink-0 flex-col pr-12">
        <div className="flex flex-col gap-2">
          {sectionLabel && (
            <p className="text-text-soft font-code text-[12px] font-medium leading-4 tracking-[-0.24px]">
              {sectionLabel}
            </p>
          )}
          <p className="text-text-strong text-label-sm font-medium leading-5">{title}</p>
          <div className="text-text-soft text-label-xs font-medium leading-4">{description}</div>
        </div>
        {extraContent}
      </div>
      {rightContent && <div className="flex min-h-0 min-w-0 flex-1 flex-col items-start">{rightContent}</div>}
    </div>
  );
}

function ProviderDropdown({ providerId, providerName }: { providerId: string; providerName: string }) {
  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-center gap-px">
        <span className="text-text-sub text-label-xs font-medium leading-4">
          What provider would you like to start with
        </span>
        <span className="text-text-soft ml-0.5 text-[10px]">&#9432;</span>
      </div>
      <div className="border-stroke-soft bg-bg-white flex h-7 items-center justify-between overflow-hidden rounded-md border px-1.5 py-1 shadow-xs">
        <div className="flex items-center gap-1">
          <ProviderIcon providerId={providerId} providerDisplayName={providerName} className="size-4 shrink-0" />
          <span className="text-text-strong text-label-xs font-medium leading-4">{providerName}</span>
        </div>
        <RiExpandUpDownLine className="text-text-soft size-3" />
      </div>
      <p className="text-text-soft text-label-xs font-medium leading-4">
        {'💡 You can always add more providers.'}
      </p>
    </div>
  );
}

function SetupButton({
  children,
  href,
  leadingIcon,
  onClick,
}: {
  children: ReactNode;
  href?: string;
  leadingIcon?: ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <Button
      variant="secondary"
      mode="outline"
      size="xs"
      className="text-text-sub gap-1 px-2 py-1.5"
      type="button"
      onClick={onClick}
    >
      {leadingIcon}
      <span className="text-label-xs font-medium">{children}</span>
      {href && <RiArrowRightUpLine className="size-3" />}
    </Button>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="w-full">
        {content}
      </a>
    );
  }

  return content;
}

function TipCallout({ children }: { children: ReactNode }) {
  return (
    <div className="w-full py-2">
      <div className="bg-bg-weak border-stroke-soft flex items-center gap-3 overflow-hidden rounded-lg border px-3 py-2.5">
        <div className="flex self-stretch items-center">
          <div className="bg-state-faded-base h-full w-1 rounded-full" />
        </div>
        <div className="text-text-sub text-label-xs font-medium leading-4">{children}</div>
      </div>
    </div>
  );
}

function ListeningStatus() {
  return (
    <div className="flex flex-col gap-2 pl-8 py-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1">
          <Loader className="size-3.5 text-[#dd2476] animate-[spin_5s_linear_infinite]" />
          <span className="animate-gradient bg-linear-to-r from-[#dd2476] via-[#ff512f] to-[#dd2476] bg-size-[400%_400%] bg-clip-text text-label-sm font-medium text-transparent">
            Listening...
          </span>
        </div>
        <p className="text-text-soft text-label-xs font-medium leading-4">
          Tag the Slack bot in your installed workspace and send a message to verify configuration.
        </p>
      </div>
      <ExternalLink href="https://docs.novu.co/agents/overview" variant="documentation">
        Learn more in docs
      </ExternalLink>
    </div>
  );
}

function buildWebhookUrl(agentId: string): string {
  const baseUrl = API_HOSTNAME ?? 'https://api.novu.co';

  return `${baseUrl}/v1/agents/${agentId}`;
}

function buildSlackManifestYaml(agent: AgentResponse, webhookUrl: string): string {
  return `display_information:
  name: "${agent.name}"
  description: Novu agent.
settings:
  event_subscriptions:
    request_url: ${webhookUrl}
    bot_events:
      - app_home_opened
      - message.im
      - assistant_thread_started
  interactivity:
    is_enabled: true
    request_url: ${webhookUrl}
  is_hosted: false
features:
  bot_user:
    display_name: ${agent.name}
    always_online: true
  assistant_view:
    assistant_description: "${agent.description || 'Novu agent.'}"
oauth_config:
  scopes:
    bot:
      - assistant:write
      - chat:write
      - im:history`;
}

function ManifestSection({
  createSlackAppUrl,
  manifestYaml,
}: {
  createSlackAppUrl: string;
  manifestYaml: string;
}) {
  const [showManifest, setShowManifest] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <a href={createSlackAppUrl} target="_blank" rel="noopener noreferrer">
        <Button
          variant="secondary"
          mode="outline"
          size="xs"
          className="text-text-sub gap-1 px-2 py-1.5"
          type="button"
        >
          <ProviderIcon
            providerId={ChatProviderIdEnum.Slack}
            providerDisplayName="Slack"
            className="size-4 shrink-0"
          />
          <span className="text-label-xs font-medium">Create slack app</span>
          <RiArrowRightUpLine className="size-3" />
        </Button>
      </a>

      <button
        type="button"
        className="text-text-sub hover:text-text-strong flex items-center gap-1 self-start py-1 transition-colors"
        onClick={() => setShowManifest((prev) => !prev)}
      >
        <RiArrowDownSLine
          className={cn('size-3.5 transition-transform duration-200', showManifest && 'rotate-180')}
        />
        <span className="text-label-xs font-medium">{showManifest ? 'Hide manifest' : 'Show manifest'}</span>
      </button>

      <AnimatePresence initial={false}>
        {showManifest && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <CodeBlock code={manifestYaml} language="shell" title="slack-app-manifest.yaml" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AgentSetupGuide({ agent }: AgentSetupGuideProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const webhookUrl = buildWebhookUrl(agent._id);
  const slackIntegration = agent.integrations?.find((i) => i.providerId === ChatProviderIdEnum.Slack);
  const manifestYaml = buildSlackManifestYaml(agent, webhookUrl);
  const createSlackAppUrl = `https://api.slack.com/apps?new_app=1&manifest_yaml=${encodeURIComponent(manifestYaml)}`;

  const step1Status: StepStatus = slackIntegration ? 'completed' : 'current';

  return (
    <div className="bg-bg-weak flex min-w-0 flex-1 flex-col rounded-[10px] p-1">
      <button
        type="button"
        className="flex w-full items-center justify-between px-2 py-1.5"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-text-soft text-[11px] font-medium uppercase leading-4 tracking-wider">Setup agent</span>
        <RiExpandUpDownLine className={cn('text-text-soft size-3 transition-transform', isExpanded && 'rotate-180')} />
      </button>

      {isExpanded && (
        <div className="bg-bg-white flex flex-col gap-0 overflow-hidden rounded-md p-3 shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
          <div className="relative flex flex-col gap-10 py-6 pb-3 pl-8 pr-6">
            <div
              className="absolute bottom-0 left-[22px] top-0 w-px"
              style={{
                background: 'linear-gradient(to bottom, transparent 0%, #E1E4EA 10%, #E1E4EA 90%, transparent 100%)',
              }}
            />

            <SetupStep
              index={1}
              status={step1Status}
              sectionLabel="1/2 SETUP PROVIDER"
              title="Choose where your agent listens and communicates"
              description="Start with one provider your agent can receive and respond on and you can always add more providers as you need."
              rightContent={
                <ProviderDropdown providerId={ChatProviderIdEnum.Slack} providerName="Slack" />
              }
            />

            <SetupStep
              index={2}
              status="current"
              title="Create Slack App via Manifest"
              description="Click the button to create a Slack app with a pre-filled manifest, or expand to view and copy the YAML manually."
              rightContent={
                <ManifestSection createSlackAppUrl={createSlackAppUrl} manifestYaml={manifestYaml} />
              }
            />

            <SetupStep
              index={3}
              status="upcoming"
              title="Paste the Client ID and secret from Slack App."
              description={
                <span>
                  {'Configure the Slack provider under Novu Integrations. View '}
                  <a
                    href="https://docs.novu.co/integrations/chat/slack"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-sub underline"
                  >
                    setup guide
                  </a>
                  .
                </span>
              }
              rightContent={
                <SetupButton href="/integrations">Setup Slack credentials</SetupButton>
              }
            />

            <SetupStep
              index={4}
              status="upcoming"
              title="Verify by installing the app to your workspace"
              description={`This is what your users need to do to install the slack app to their workspace to start interacting with it.`}
              extraContent={
                <TipCallout>
                  <span>
                    <span className="text-text-strong">Tip:</span>
                    {'  Integrate '}
                    <code className="font-code text-[12px] tracking-[-0.24px]">{'<SlackConnectButton />'}</code>
                    {' in your application, to let your users easily connect to this agent on Slack. '}
                    <a
                      href="https://docs.novu.co"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-sub underline"
                    >
                      Read docs
                    </a>
                    .
                  </span>
                </TipCallout>
              }
              rightContent={
                <SetupButton href={`https://slack.com/oauth/v2/authorize`}>
                  <ProviderIcon
                    providerId={ChatProviderIdEnum.Slack}
                    providerDisplayName="Slack"
                    className="size-4 shrink-0"
                  />
                  Install {agent.name}
                </SetupButton>
              }
            />
          </div>

          <ListeningStatus />
        </div>
      )}
    </div>
  );
}
