import { useOrganization } from '@clerk/react';
import {
  ChannelTypeEnum,
  DirectionEnum,
  FeatureFlagsKeysEnum,
  type IIntegration,
  ProductUseCasesEnum,
} from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { RiAddLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import {
  type AgentResponse,
  getAgentIntegrationsQueryKey,
  getAgentsListQueryKey,
  listAgentIntegrations,
  listAgents,
} from '@/api/agents';
import { docsUrl } from '@/components/header-navigation/support-drawer-constants';
import { IS_EU, IS_SELF_HOSTED, ONBOARDING_DEMO_WORKFLOW_ID } from '@/config';
import { useAuth } from '@/context/auth/hooks';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useFetchWorkflows } from '@/hooks/use-fetch-workflows';
import { useTelemetry } from '@/hooks/use-telemetry';
import { AGENTS_DOCS_OVERVIEW_URL } from '@/utils/agent-docs';
import { buildRoute, ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import type { WelcomeSetupStep } from './setup-steps-card';

export type WelcomeVariant = 'agents' | 'standard';

export type UseWelcomeSetupResult = {
  variant: WelcomeVariant;
  steps: WelcomeSetupStep[];
  isLoading: boolean;
  /** Agents view: nudge to set up Workflows when none exist. */
  showWorkflowsBanner: boolean;
  /** Standard view: nudge to set up Agents when none exist (and agents are available). */
  showAgentsBanner: boolean;
  goToWorkflows: () => void;
  goToAgentsSetup: () => void;
  openDocs: () => void;
};

const AGENTS_PEEK_PARAMS = { after: undefined, before: undefined, limit: 2, identifier: '' };

function hasInboxIntegration(integrations: IIntegration[] | undefined): boolean {
  return Boolean(
    integrations?.some(
      (integration) =>
        integration.channel === ChannelTypeEnum.IN_APP &&
        !integration.providerId.startsWith('novu-') &&
        !!integration.connected
    )
  );
}

export function useWelcomeSetup(): UseWelcomeSetupResult {
  const navigate = useNavigate();
  const telemetry = useTelemetry();
  const { currentEnvironment } = useEnvironment();
  const { currentOrganization } = useAuth();
  const { organization } = useOrganization();

  const isAgentsEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED, false);
  const agentsAvailable = isAgentsEnabled && !IS_EU;
  const pickedAgents = Boolean(currentOrganization?.productUseCases?.[ProductUseCasesEnum.AGENTS]);
  const variant: WelcomeVariant = pickedAgents && agentsAvailable ? 'agents' : 'standard';

  const environmentSlug = currentEnvironment?.slug ?? '';

  const agentsQuery = useQuery({
    queryKey: getAgentsListQueryKey(currentEnvironment?._id, AGENTS_PEEK_PARAMS),
    queryFn: () =>
      listAgents({
        environment: requireEnvironment(currentEnvironment, 'No environment selected'),
        limit: 2,
        orderBy: 'updatedAt',
        orderDirection: DirectionEnum.DESC,
      }),
    enabled: !!currentEnvironment && agentsAvailable,
  });

  const workflowsQuery = useFetchWorkflows({ limit: 12 });
  const { integrations } = useFetchIntegrations();

  const agents: AgentResponse[] = agentsQuery.data?.data ?? [];
  const hasAgent = agents.length > 0;
  const onlyAgent = agents.length === 1 ? agents[0] : undefined;

  const agentIntegrationsQuery = useQuery({
    queryKey: getAgentIntegrationsQueryKey(currentEnvironment?._id, onlyAgent?.identifier),
    queryFn: () =>
      listAgentIntegrations({
        environment: requireEnvironment(currentEnvironment, 'No environment selected'),
        agentIdentifier: onlyAgent?.identifier ?? '',
        limit: 50,
      }),
    enabled: !!currentEnvironment && agentsAvailable && !!onlyAgent,
  });

  const hasConnectedChannel = useMemo(
    () => (agentIntegrationsQuery.data?.data ?? []).some((link) => Boolean(link.connectedAt)),
    [agentIntegrationsQuery.data?.data]
  );

  const hasWorkflow = useMemo(
    () =>
      (workflowsQuery.data?.workflows ?? []).filter((workflow) => workflow.workflowId !== ONBOARDING_DEMO_WORKFLOW_ID)
        .length > 0,
    [workflowsQuery.data?.workflows]
  );

  const hasInbox = useMemo(() => hasInboxIntegration(integrations), [integrations]);
  const hasTeam = (organization?.membersCount ?? 0) > 1;

  const goToWorkflowsCreate = useCallback(() => {
    if (!environmentSlug) return;

    void navigate(buildRoute(ROUTES.WORKFLOWS_CREATE, { environmentSlug }));
  }, [environmentSlug, navigate]);

  const goToAgentsSetup = useCallback(() => {
    void navigate(ROUTES.AGENTS_SETUP);
  }, [navigate]);

  const goToInbox = useCallback(() => {
    void navigate(ROUTES.INBOX_EMBED);
  }, [navigate]);

  const goToTeam = useCallback(() => {
    void navigate(ROUTES.SETTINGS_TEAM);
  }, [navigate]);

  const goToAgentChannel = useCallback(() => {
    if (onlyAgent && environmentSlug) {
      void navigate(
        buildRoute(ROUTES.AGENT_DETAILS_TAB, {
          environmentSlug,
          agentIdentifier: encodeURIComponent(onlyAgent.identifier),
          agentTab: 'integrations',
        })
      );

      return;
    }

    void navigate(ROUTES.AGENTS_SETUP);
  }, [environmentSlug, navigate, onlyAgent]);

  const openDocs = useCallback(() => {
    const url = variant === 'agents' ? AGENTS_DOCS_OVERVIEW_URL : docsUrl('/platform/quickstart');
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [variant]);

  const trackCta = useCallback(
    (stepId: string) => {
      telemetry(TelemetryEvent.WELCOME_STEP_CLICKED, { stepId, variant });
    },
    [telemetry, variant]
  );

  const isLoading =
    (agentsAvailable && agentsQuery.isLoading) || workflowsQuery.isLoading || integrations === undefined;

  const steps = useMemo<WelcomeSetupStep[]>(() => {
    const accountStep: WelcomeSetupStep = {
      id: 'account-creation',
      title: 'Account creation',
      description: "We know it's not always easy — take a moment to celebrate!",
      status: 'completed',
    };

    const inviteStep: WelcomeSetupStep = {
      id: 'invite-team',
      title: 'Invite a team member',
      description:
        'Invite teammates to collaborate on agents and let them add their own custom agents for internal use.',
      status: hasTeam ? 'completed' : 'pending',
      ctaLabel: 'Invite teammates',
      onCtaClick: () => {
        trackCta('invite-team');
        goToTeam();
      },
    };

    if (variant === 'agents') {
      const agentSteps: WelcomeSetupStep[] = [
        accountStep,
        {
          id: 'add-agent',
          title: 'Add an agent',
          description: 'Give it a name, a system prompt, and pick the tools it can use.',
          status: hasAgent ? 'completed' : 'pending',
          ctaLabel: 'Add an agent',
          ctaTrailingIcon: RiAddLine,
          ctaDisabled: isLoading,
          onCtaClick: () => {
            trackCta('add-agent');
            goToAgentsSetup();
          },
        },
        {
          id: 'connect-channel',
          title: 'Connect a channel',
          description:
            'Slack, Teams, WhatsApp, or Email. Pick where your agent lives. You can add more channels later.',
          status: hasConnectedChannel ? 'completed' : 'pending',
          ctaLabel: 'Setup agent',
          ctaDisabled: isLoading,
          onCtaClick: () => {
            trackCta('connect-channel');
            goToAgentChannel();
          },
        },
        inviteStep,
      ];

      return IS_SELF_HOSTED ? agentSteps.filter((step) => step.id !== 'invite-team') : agentSteps;
    }

    const standardSteps: WelcomeSetupStep[] = [
      accountStep,
      {
        id: 'embed-inbox',
        title: 'Add <Inbox/> to your product',
        description:
          'Give users a place to receive workflow notifications, manage preferences, and reopen conversations with your agents.',
        status: hasInbox ? 'completed' : 'pending',
        ctaLabel: 'Embed Inbox',
        ctaDisabled: isLoading,
        onCtaClick: () => {
          trackCta('embed-inbox');
          goToInbox();
        },
      },
      {
        id: 'create-workflow',
        title: 'Create a workflow',
        description:
          'Start with events like payment failed, or task assigned, then let users ask the agent what happened and what to do next.',
        status: hasWorkflow ? 'completed' : 'pending',
        ctaLabel: 'Create a workflow',
        ctaTrailingIcon: RiAddLine,
        ctaDisabled: isLoading,
        onCtaClick: () => {
          trackCta('create-workflow');
          goToWorkflowsCreate();
        },
      },
      inviteStep,
    ];

    return IS_SELF_HOSTED ? standardSteps.filter((step) => step.id !== 'invite-team') : standardSteps;
  }, [
    goToAgentChannel,
    goToAgentsSetup,
    goToInbox,
    goToTeam,
    goToWorkflowsCreate,
    hasAgent,
    hasConnectedChannel,
    hasInbox,
    hasTeam,
    hasWorkflow,
    isLoading,
    trackCta,
    variant,
  ]);

  const hasAnyWorkflow = (workflowsQuery.data?.totalCount ?? 0) > 0;
  const showWorkflowsBanner = variant === 'agents' && !workflowsQuery.isLoading && !hasAnyWorkflow;
  const showAgentsBanner = variant === 'standard' && agentsAvailable && !agentsQuery.isLoading && !hasAgent;

  return {
    variant,
    steps,
    isLoading,
    showWorkflowsBanner,
    showAgentsBanner,
    goToWorkflows: goToWorkflowsCreate,
    goToAgentsSetup,
    openDocs,
  };
}
