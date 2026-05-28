import {
  AgentRuntimeProviderIdEnum,
  FeatureFlagsKeysEnum,
  type IIntegration,
  IntegrationKindEnum,
  slugify,
} from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Mail } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiArrowLeftSLine, RiArrowRightSLine, RiCloseLine } from 'react-icons/ri';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  getClaudeManagedAgentIntegrations,
  isDemoManagedClaudeIntegrationSelected,
} from '@/components/agents/connectors/claude-managed-integrations';
import {
  ConnectorIntegrationDropdown,
  type ConnectorIntegrationStatus,
} from '@/components/agents/connectors/connector-integration-dropdown';
import { type ConnectorOption, getConnectorById } from '@/components/agents/connectors/connector-options';
import {
  buildManagedIntegrationCredentials,
  buildVerifyCredentialsPayload,
  buildVerifyFingerprint,
  ConfigureCredentialsSection,
  type CreateAgentFormErrors,
  hasCompleteManagedCredentials,
  type VerifyStatus,
  validateManagedCredentialFields,
} from '@/components/agents/create-agent-fields';
import { SetupStep } from '@/components/agents/setup-guide-primitives';
import type { StepStatus } from '@/components/agents/setup-guide-step-utils';
import { AgentFlowIllustration } from '@/components/onboarding/agent-flow-illustration';
import {
  GenerationStatus,
  type GenerationStep,
} from '@/components/onboarding/connect-agent/generation-status';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { PageMeta } from '@/components/page-meta';
import { Button } from '@/components/primitives/button';
import { InlineToast } from '@/components/primitives/inline-toast';
import {
  SegmentedControl,
  SegmentedControlList,
  SegmentedControlTrigger,
} from '@/components/primitives/segmented-control';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';
import { useCreateAgentMutation } from '@/hooks/use-create-agent-mutation';
import { useCreateIntegration } from '@/hooks/use-create-integration';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useManagedClaudeCredentialsFlow } from '@/hooks/use-managed-claude-credentials-flow';
import { useTelemetry } from '@/hooks/use-telemetry';
import { useVerifyManagedCredentials } from '@/hooks/use-verify-managed-credentials';
import { QueryKeys } from '@/utils/query-keys';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';

const CHANNELS = [
  {
    id: 'slack',
    label: 'Slack',
    icon: '/images/providers/light/square/slack.svg',
  },
  {
    id: 'email',
    label: 'Email',
    lucideIcon: Mail,
  },
  {
    id: 'whatsapp',
    label: 'Whatsapp',
    icon: '/images/providers/light/square/whatsapp-business.svg',
  },
] as const;

type ChannelId = (typeof CHANNELS)[number]['id'];

interface StepDef {
  title: string;
  description: string;
  note?: string;
}

const STEPS_BY_CHANNEL: Record<ChannelId, StepDef[]> = {
  slack: [
    {
      title: 'Install in your workspace',
      description:
        'This is what your users need to do to install the slack app to their workspace to start interacting with it.',
    },
    {
      title: 'Say hello in Slack',
      description: 'Tag @Support Agent in any channel and send a message.',
      note: "This is Novu's demo Slack app. You'll swap it for your own provider integrations later, after your agent is integrated.",
    },
  ],
  email: [
    {
      title: 'Configure email provider',
      description: 'Set up your email integration to enable agent conversations over email.',
    },
    {
      title: 'Send a test email',
      description: 'Send a message to verify your email configuration is working.',
    },
  ],
  whatsapp: [
    {
      title: 'Connect WhatsApp Business',
      description: 'Link your WhatsApp Business account to start receiving messages.',
    },
    {
      title: 'Send a test message',
      description: 'Send a WhatsApp message to verify the connection.',
    },
  ],
};

const DEMO_AGENT_NAME = 'Support Agent';
const DEMO_AGENT_INSTRUCTIONS =
  'You are a helpful support agent. Greet users by name when possible, answer their questions clearly, and escalate to a human teammate when you are unsure.';

// Animated steps shown in the footer while the demo agent is being provisioned. Mirrors the
// pattern used by `apps/dashboard/src/components/agents/create-agent-dialog.tsx` so the two
// flows feel consistent. Texts are tailored for the demo agent setup (no LLM generation).
const SETUP_STEPS: ReadonlyArray<GenerationStep> = [
  { id: 'spinning', text: 'Spinning up your demo agent' },
  { id: 'connect', text: 'Connecting to Anthropic' },
  { id: 'channels', text: 'Wiring up your channels' },
  { id: 'tools', text: 'Picking the right tools' },
  { id: 'ready', text: 'Almost there' },
];

// Matches the connect-agent footer visual rhythm: a fixed 56px slot keeps the rotating status
// from snapping the page taller while the agent is being created.
const FOOTER_STATUS_HEIGHT = 56;

function InstallButton({ channel }: { channel: ChannelId }) {
  if (channel !== 'slack') {
    return null;
  }

  return (
    <button
      type="button"
      className="inline-flex cursor-pointer items-center gap-0.5 rounded-md px-2 py-1.5"
      style={{
        backgroundImage:
          'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.02) 100%), linear-gradient(90deg, #fff 0%, #fff 100%)',
        boxShadow: '0 0 0 1px #e1e4ea, 0 1px 3px 0 rgba(14,18,27,0.12)',
      }}
    >
      <img src="/images/providers/light/square/slack.svg" alt="" className="size-4" />
      <span className="text-text-sub px-1 text-label-xs font-medium">Install Support agent</span>
      <span className="rounded-full bg-warning-lighter px-1.5 py-[3.5px] text-[11px] font-medium uppercase leading-3 tracking-wide text-warning-base">
        demo
      </span>
    </button>
  );
}

function ListeningIndicator() {
  return (
    <div className="flex items-center gap-1 py-4 pl-8">
      <div className="flex items-center gap-1">
        <span className="size-3.5 text-[#dd2476] animate-[spin_5s_linear_infinite]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </span>
        <span className="animate-gradient bg-linear-to-r from-[#dd2476] via-[#ff512f] to-[#dd2476] bg-size-[400%_400%] bg-clip-text text-label-sm font-medium text-transparent">
          Listening for a message...
        </span>
      </div>
    </div>
  );
}

function getStepStatus(index: number): StepStatus {
  if (index === 0) return 'completed';
  if (index === 1) return 'current';

  return 'upcoming';
}

function dropdownStatusFor(verify: VerifyStatus, hasIntegration: boolean): ConnectorIntegrationStatus {
  if (hasIntegration || verify === 'valid') return 'valid';
  if (verify === 'invalid') return 'missing';

  return 'idle';
}

export function AgentsUsecasePage() {
  const isAgentsEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED, false);
  const isManagedEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_MANAGED_AGENT_RUNTIME_ENABLED, false);
  const navigate = useNavigate();
  const telemetry = useTelemetry();
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const { integrations } = useFetchIntegrations();
  const { submit: submitAgent, isPending: isCreatingAgent } = useCreateAgentMutation();
  const { mutateAsync: createIntegration, isPending: isSavingIntegration } = useCreateIntegration();
  const verifyMutation = useVerifyManagedCredentials();

  const [activeChannel, setActiveChannel] = useState<ChannelId>('slack');

  // Demo agents are always Claude-managed: the demo connector dropdown is locked to Claude
  // and only surfaces Anthropic integrations (demo + customer-provided keys). No connector
  // switching is possible from this page.
  const lockedConnectorId = 'claude' as const;
  const selectedConnector = getConnectorById(lockedConnectorId);
  const claudeProviderId = selectedConnector?.providerId ?? AgentRuntimeProviderIdEnum.Anthropic;
  const claudeProviderLabel = selectedConnector?.providerLabel ?? 'Anthropic';

  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | undefined>(undefined);
  const [credentialsPanelVisible, setCredentialsPanelVisible] = useState(false);
  const [credentialsPanelExpanded, setCredentialsPanelExpanded] = useState(true);
  const [integrationName, setIntegrationName] = useState('');
  const [showSavedBadge, setShowSavedBadge] = useState(false);
  const [errors, setErrors] = useState<CreateAgentFormErrors>({});
  // Holds the integration id from "Save integration" until it appears in the fetched list, so the
  // auto-select effect doesn't overwrite it or reopen the credentials section during refetch.
  const pinnedIntegrationIdRef = useRef<string | null>(null);
  const savedBadgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the entire "Setup agent" submission lifecycle (verify → save integration → create
  // agent → navigate). Without it the rotating status would flicker off between mutations.
  const [isSubmitInFlight, setIsSubmitInFlight] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>(undefined);

  const {
    apiKey,
    externalWorkspaceId,
    region,
    verifyStatus,
    verifyMessage,
    lastVerifiedKeyRef,
    setApiKey,
    setExternalWorkspaceId,
    setRegion,
    setVerifyStatus,
    setVerifyMessage,
    resetCredentials,
  } = useManagedClaudeCredentialsFlow();

  const matchingClaudeIntegrations = useMemo(
    () => getClaudeManagedAgentIntegrations(integrations, claudeProviderId),
    [integrations, claudeProviderId]
  );

  const isDemoProviderSelected = isDemoManagedClaudeIntegrationSelected(integrations, selectedIntegrationId);

  // Auto-select the first existing Claude integration once integrations load. If none exist,
  // surface the inline credentials panel so the user can configure their own. Skipped while a
  // pinned id is still being reconciled (right after "Save integration").
  useEffect(() => {
    if (integrations === undefined) return;

    const pinnedId = pinnedIntegrationIdRef.current;
    if (pinnedId) {
      const pinnedExists = matchingClaudeIntegrations.some((i) => i._id === pinnedId);
      if (pinnedExists) {
        pinnedIntegrationIdRef.current = null;
      } else if (selectedIntegrationId !== pinnedId) {
        setSelectedIntegrationId(pinnedId);
      }

      return;
    }

    if (credentialsPanelVisible && !selectedIntegrationId) return;

    if (selectedIntegrationId) {
      const stillExists = matchingClaudeIntegrations.some((i) => i._id === selectedIntegrationId);
      if (stillExists) return;
    }

    if (matchingClaudeIntegrations.length > 0) {
      setSelectedIntegrationId(matchingClaudeIntegrations[0]._id);
      setCredentialsPanelVisible(false);

      return;
    }

    setSelectedIntegrationId(undefined);
    setCredentialsPanelVisible(true);
    setCredentialsPanelExpanded(true);
  }, [integrations, matchingClaudeIntegrations, selectedIntegrationId, credentialsPanelVisible]);

  // Default integration name = "<Provider> <next-index>" — same convention as the create-agent dialog.
  useEffect(() => {
    if (!credentialsPanelVisible) return;
    if (integrationName.trim()) return;

    const nextIndex = matchingClaudeIntegrations.length + 1;
    setIntegrationName(`${claudeProviderLabel} ${nextIndex}`);
  }, [credentialsPanelVisible, matchingClaudeIntegrations.length, integrationName, claudeProviderLabel]);

  useEffect(() => {
    return () => {
      if (savedBadgeTimerRef.current) clearTimeout(savedBadgeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    telemetry(TelemetryEvent.AGENTS_USECASE_PAGE_VIEWED);
  }, [telemetry]);

  const handleSelectIntegration = useCallback(
    (integration: IIntegration) => {
      setSelectedIntegrationId(integration._id);
      setCredentialsPanelVisible(false);
      resetCredentials();
      setSubmitError(undefined);
      setErrors((prev) => ({
        ...prev,
        apiKey: undefined,
        integrationName: undefined,
        region: undefined,
        externalWorkspaceId: undefined,
      }));
    },
    [resetCredentials]
  );

  const handleRequestSetupCredentials = useCallback(
    (option: ConnectorOption) => {
      setSelectedIntegrationId(undefined);
      setCredentialsPanelVisible(true);
      setCredentialsPanelExpanded(true);
      setSubmitError(undefined);
      setVerifyStatus('idle');
      setVerifyMessage(undefined);
      lastVerifiedKeyRef.current = null;

      if (option.providerLabel && !integrationName.trim()) {
        const nextIndex = getClaudeManagedAgentIntegrations(integrations, option.providerId).length + 1;
        setIntegrationName(`${option.providerLabel} ${nextIndex}`);
      }
    },
    [integrations, integrationName, lastVerifiedKeyRef, setVerifyMessage, setVerifyStatus]
  );

  const handleApiKeyChange = useCallback(
    (next: string) => {
      setApiKey(next);
      setErrors((prev) => ({ ...prev, apiKey: undefined }));
    },
    [setApiKey]
  );

  const handleVerify = useCallback(() => {
    if (verifyMutation.isPending) return;

    const fields = { apiKey, region, externalWorkspaceId };
    const verifyKey = buildVerifyFingerprint(claudeProviderId, fields);

    if (lastVerifiedKeyRef.current === verifyKey && verifyStatus === 'valid') return;

    lastVerifiedKeyRef.current = verifyKey;
    setVerifyStatus('verifying');
    setVerifyMessage(undefined);

    verifyMutation.mutate(buildVerifyCredentialsPayload(claudeProviderId, fields), {
      onSuccess: () => {
        if (lastVerifiedKeyRef.current !== verifyKey) return;
        setVerifyStatus('valid');
        setVerifyMessage(undefined);
        setErrors((prev) => ({ ...prev, apiKey: undefined }));
      },
      onError: (err) => {
        if (lastVerifiedKeyRef.current !== verifyKey) return;
        setVerifyStatus('invalid');
        setVerifyMessage(err instanceof Error ? err.message : 'Invalid');
      },
    });
  }, [
    apiKey,
    claudeProviderId,
    externalWorkspaceId,
    lastVerifiedKeyRef,
    region,
    setVerifyMessage,
    setVerifyStatus,
    verifyMutation,
    verifyStatus,
  ]);

  const handleSaveIntegration = useCallback(async () => {
    const trimmedName = integrationName.trim();
    const fields = { apiKey, region, externalWorkspaceId };

    if (!trimmedName) return;
    if (!hasCompleteManagedCredentials(claudeProviderId, fields)) return;

    try {
      const { data: integration } = await createIntegration({
        active: true,
        kind: IntegrationKindEnum.AGENT,
        providerId: claudeProviderId,
        credentials: buildManagedIntegrationCredentials(claudeProviderId, fields),
        name: trimmedName,
      });

      const environmentId = currentEnvironment?._id;
      if (environmentId) {
        queryClient.setQueryData<IIntegration[]>([QueryKeys.fetchIntegrations, environmentId], (existing) => {
          const list = existing ?? [];
          if (list.some((item) => item._id === integration._id)) return list;

          return [...list, integration];
        });
      }

      pinnedIntegrationIdRef.current = integration._id;
      setCredentialsPanelVisible(true);
      setCredentialsPanelExpanded(false);
      setSelectedIntegrationId(integration._id);
      resetCredentials();
      setShowSavedBadge(true);
      if (savedBadgeTimerRef.current) clearTimeout(savedBadgeTimerRef.current);
      savedBadgeTimerRef.current = setTimeout(() => setShowSavedBadge(false), 2500);
      showSuccessToast(`${trimmedName} is ready to use.`, 'Integration saved');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save integration.';
      showErrorToast(message, 'Save failed');
    }
  }, [
    apiKey,
    claudeProviderId,
    createIntegration,
    currentEnvironment?._id,
    externalWorkspaceId,
    integrationName,
    queryClient,
    region,
    resetCredentials,
  ]);

  const handleSetupAgent = useCallback(async () => {
    if (isSubmitInFlight || isCreatingAgent || isSavingIntegration) return;

    setSubmitError(undefined);

    const trimmedName = integrationName.trim();
    const fields = { apiKey, region, externalWorkspaceId };

    // When the user is configuring brand-new credentials but hasn't picked an existing
    // integration, validate the credential fields before kicking off any mutations.
    const needsInlineCredentials =
      credentialsPanelVisible && !selectedIntegrationId && !pinnedIntegrationIdRef.current;

    if (needsInlineCredentials) {
      const credentialErrors = validateManagedCredentialFields({
        providerId: claudeProviderId,
        apiKey,
        region,
        externalWorkspaceId,
      });

      if (credentialErrors.apiKey || credentialErrors.region || credentialErrors.externalWorkspaceId) {
        setErrors((prev) => ({ ...prev, ...credentialErrors }));

        return;
      }

      if (!trimmedName) {
        setErrors((prev) => ({ ...prev, integrationName: 'Integration name is required' }));

        return;
      }
    }

    setIsSubmitInFlight(true);

    telemetry(TelemetryEvent.AGENTS_USECASE_SETUP_CLICKED, {
      channel: activeChannel,
      hasIntegration: Boolean(selectedIntegrationId),
      isDemoIntegration: isDemoProviderSelected,
    });

    const created = await submitAgent(
      {
        name: DEMO_AGENT_NAME,
        identifier: slugify(DEMO_AGENT_NAME),
        instructions: DEMO_AGENT_INSTRUCTIONS,
        apiKey,
        runtime: 'claude',
        isExistingMode: false,
        providerId: claudeProviderId,
        externalAgentId: '',
        externalEnvironmentId: '',
        externalWorkspaceId: externalWorkspaceId.trim() || undefined,
        region: region.trim() || undefined,
        integrationId: selectedIntegrationId,
        integrationName: trimmedName || undefined,
      },
      {
        onError: (err) => {
          setIsSubmitInFlight(false);
          const message = err instanceof Error ? err.message : 'Could not set up your demo agent.';
          setSubmitError(message);
          showErrorToast(message, 'Setup failed');
        },
      }
    );

    if (!created) {
      // submitAgent already invoked onError, the busy state is cleared above.
      return;
    }

    const slug = currentEnvironment?.slug;
    if (slug) {
      navigate(
        buildRoute(ROUTES.AGENT_DETAILS, {
          environmentSlug: slug,
          agentIdentifier: encodeURIComponent(created.identifier),
        })
      );
    }
  }, [
    activeChannel,
    apiKey,
    claudeProviderId,
    credentialsPanelVisible,
    currentEnvironment?.slug,
    externalWorkspaceId,
    integrationName,
    isCreatingAgent,
    isDemoProviderSelected,
    isSavingIntegration,
    isSubmitInFlight,
    navigate,
    region,
    selectedIntegrationId,
    submitAgent,
    telemetry,
  ]);

  if (!isAgentsEnabled) {
    return <Navigate to={ROUTES.INBOX_USECASE} replace />;
  }

  const steps = STEPS_BY_CHANNEL[activeChannel];
  const dropdownStatus = dropdownStatusFor(verifyStatus, Boolean(selectedIntegrationId));
  const showCredentialsSection = credentialsPanelVisible;
  const isSubmitBusy = isSubmitInFlight || isCreatingAgent;

  const leftContent = (
    <>
      <PageMeta title="Experience a demo agent from Novu" />
      <button
        type="button"
        onClick={() => navigate(ROUTES.USECASE_SELECT)}
        className="mb-5 flex cursor-pointer items-center gap-0.5"
      >
        <RiArrowLeftSLine className="text-text-sub size-4" />
        <span className="text-text-sub text-xs">2/3</span>
      </button>

      <h1 className="text-foreground text-xl font-semibold">Experience a demo agent from Novu.</h1>
      <p className="text-text-sub mt-2 text-xs font-medium leading-4">
        You&apos;re just a couple steps away from giving your agents the unified voice.
      </p>

      {isManagedEnabled ? (
        <div className="mt-6 flex flex-col gap-2">
          <span className="text-text-strong text-label-xs font-medium">Where do you want your agent?</span>
          <ConnectorIntegrationDropdown
            selectedConnectorId={lockedConnectorId}
            selectedIntegrationId={selectedIntegrationId}
            integrations={integrations}
            status={dropdownStatus}
            showStatusBadge={showSavedBadge}
            disabled={isSubmitBusy}
            lockedConnectorId={lockedConnectorId}
            onSelectConnector={() => undefined}
            onSelectIntegration={handleSelectIntegration}
            onRequestSetupCredentials={handleRequestSetupCredentials}
          />

          {showCredentialsSection ? (
            <ConfigureCredentialsSection
              providerId={claudeProviderId}
              providerLabel={claudeProviderLabel}
              integrationName={integrationName}
              apiKey={apiKey}
              externalWorkspaceId={externalWorkspaceId}
              region={region}
              errors={errors}
              disabled={isSubmitBusy}
              status={verifyStatus}
              statusMessage={verifyMessage}
              isSaving={isSavingIntegration}
              expanded={credentialsPanelExpanded}
              onExpandedChange={setCredentialsPanelExpanded}
              onIntegrationNameChange={(next) => {
                setIntegrationName(next);
                setErrors((prev) => ({ ...prev, integrationName: undefined }));
              }}
              onApiKeyChange={handleApiKeyChange}
              onExternalWorkspaceIdChange={(next) => {
                setExternalWorkspaceId(next);
                setErrors((prev) => ({ ...prev, externalWorkspaceId: undefined }));
              }}
              onRegionChange={(next) => {
                setRegion(next);
                setErrors((prev) => ({ ...prev, region: undefined }));
              }}
              onVerify={handleVerify}
              onSave={handleSaveIntegration}
            />
          ) : null}
        </div>
      ) : null}

      <div className="relative mt-6">
        <div
          className="absolute left-[22px] top-0 w-px"
          style={{
            height: 'calc(100% + 40px)',
            background: 'linear-gradient(to bottom, #e4e7ec 0%, #e4e7ec 80%, transparent 100%)',
          }}
        />
        <div className="relative z-10 flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2.5">
          <span className="text-text-sub text-xs font-medium">Experience the agent across multiple channels</span>
          <SegmentedControl value={activeChannel} onValueChange={(v) => setActiveChannel(v as ChannelId)}>
            <SegmentedControlList className="w-auto">
              {CHANNELS.map((channel) => (
                <SegmentedControlTrigger key={channel.id} value={channel.id} className="gap-1.5 px-2 text-xs">
                  {'icon' in channel ? (
                    <img src={channel.icon} alt="" className="size-4" />
                  ) : (
                    <channel.lucideIcon className="text-text-soft size-4" strokeWidth={1.5} />
                  )}
                  {channel.label}
                </SegmentedControlTrigger>
              ))}
            </SegmentedControlList>
          </SegmentedControl>
        </div>

        <div className="mt-8 flex flex-col gap-14 pl-8">
          {steps.map((step, index) => {
            const status = getStepStatus(index);

            return (
              <SetupStep
                key={step.title}
                index={index + 1}
                status={status}
                title={step.title}
                description={step.description}
                extraContent={
                  step.note ? (
                    <InlineToast className="mt-3" variant="tip" title="Note:" description={step.note} />
                  ) : undefined
                }
                rightContent={
                  <>
                    {status === 'completed' && <InstallButton channel={activeChannel} />}
                    {status === 'current' && <ListeningIndicator />}
                  </>
                }
              />
            );
          })}
        </div>
      </div>

      {submitError ? (
        <p className="text-error-base mt-4 text-label-xs" role="alert">
          {submitError}
        </p>
      ) : null}

      <div className="mt-10 flex items-center gap-3">
        {isSubmitBusy ? (
          <>
            <div className="flex h-14 -mt-3 -mb-3 min-w-0 flex-1 items-center">
              <GenerationStatus
                steps={SETUP_STEPS}
                containerHeight={FOOTER_STATUS_HEIGHT}
                className="w-full max-w-[420px]"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              mode="outline"
              size="xs"
              className="shrink-0 gap-1"
              disabled
              trailingIcon={RiCloseLine}
            >
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              mode="gradient"
              size="xs"
              type="button"
              isLoading={isSubmitBusy}
              trailingIcon={RiArrowRightSLine}
              onClick={handleSetupAgent}
            >
              Setup agent
            </Button>

            <Button variant="secondary" mode="ghost" size="xs" onClick={() => navigate(ROUTES.WORKFLOWS)}>
              Skip to dashboard
            </Button>
          </>
        )}
      </div>
    </>
  );

  const rightContent = <AgentFlowIllustration state="connect" runtime="scratch" />;

  return <OnboardingShell left={leftContent} right={rightContent} maxLeftWidth="820px" />;
}
