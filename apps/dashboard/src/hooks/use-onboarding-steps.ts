import { useMemo } from 'react';
import { useFetchWorkflows } from './use-fetch-workflows';
import { useOrganization } from '@clerk/clerk-react';
import { ChannelTypeEnum, IIntegration } from '@novu/shared';
import { useFetchIntegrations } from './use-fetch-integrations';
import { ONBOARDING_DEMO_WORKFLOW_ID } from '../config';

export enum StepIdEnum {
  ACCOUNT_CREATION = 'account-creation',
  CREATE_A_WORKFLOW = 'create-a-workflow',
  INVITE_TEAM_MEMBER = 'invite-team-member',
  SYNC_TO_PRODUCTION = 'sync-to-production',
  CONNECT_EMAIL_PROVIDER = 'connect-email-provider',
  CONNECT_IN_APP_PROVIDER = 'connect-in_app-provider',
  CONNECT_PUSH_PROVIDER = 'connect-push-provider',
  CONNECT_CHAT_PROVIDER = 'connect-chat-provider',
  CONNECT_SMS_PROVIDER = 'connect-sms-provider',
}

export type StepStatus = 'completed' | 'in-progress' | 'pending';

export interface Step {
  id: StepIdEnum;
  title: string;
  description: string;
  status: StepStatus;
}

interface OrganizationMetadata {
  useCases?: ChannelTypeEnum[];
  [key: string]: unknown;
}

interface OnboardingStepsResult {
  steps: Step[];
  providerType: ChannelTypeEnum;
  totalSteps: number;
  completedSteps: number;
}

const DEFAULT_USE_CASES: ChannelTypeEnum[] = [ChannelTypeEnum.IN_APP];
const PROVIDER_TYPE_PRIORITIES: ChannelTypeEnum[] = [ChannelTypeEnum.IN_APP, ChannelTypeEnum.EMAIL];

function getProviderTitle(providerType: ChannelTypeEnum): string {
  return providerType === ChannelTypeEnum.IN_APP ? 'Add an Inbox to your app' : `Connect your ${providerType} provider`;
}

function getProviderDescription(providerType: ChannelTypeEnum): string {
  return providerType === ChannelTypeEnum.IN_APP
    ? 'Embed a full-featured Inbox in your app in minutes'
    : `Connect your provider to send ${providerType} notifications with Novu.`;
}

function isActiveIntegration(integration: IIntegration, providerType: ChannelTypeEnum): boolean {
  const isMatchingChannel = integration.channel === providerType;
  const isNotNovuProvider = !integration.providerId.startsWith('novu-');
  const isConnected = providerType === ChannelTypeEnum.IN_APP ? !!integration.connected : true;

  return isMatchingChannel && isNotNovuProvider && isConnected;
}

export function useOnboardingSteps(): OnboardingStepsResult {
  const workflows = useFetchWorkflows();
  const { organization } = useOrganization();
  const { integrations } = useFetchIntegrations();

  const hasInvitedTeamMember = useMemo(() => {
    return (organization?.membersCount ?? 0) > 1;
  }, [organization?.membersCount]);

  const hasCreatedWorkflow = useMemo(() => {
    return (
      (workflows?.data?.workflows ?? []).filter((workflow) => workflow.workflowId !== ONBOARDING_DEMO_WORKFLOW_ID)
        .length > 0
    );
  }, [workflows?.data?.workflows]);

  const providerType = useMemo(() => {
    const metadata = organization?.publicMetadata as OrganizationMetadata;
    const useCases = metadata?.useCases ?? DEFAULT_USE_CASES;

    return PROVIDER_TYPE_PRIORITIES.find((type) => useCases.includes(type)) ?? useCases[0];
  }, [organization?.publicMetadata]);

  const steps = useMemo(
    (): Step[] => [
      {
        id: StepIdEnum.ACCOUNT_CREATION,
        title: 'Account creation',
        description: "We know it's not always easy — take a moment to celebrate!",
        status: 'completed',
      },
      {
        id: StepIdEnum.CREATE_A_WORKFLOW,
        title: 'Create a workflow',
        description: 'Workflows in Novu, orchestrate notifications across channels.',
        status: hasCreatedWorkflow ? 'completed' : 'in-progress',
      },
      {
        id: `connect-${providerType}-provider` as StepIdEnum,
        title: getProviderTitle(providerType),
        description: getProviderDescription(providerType),
        status: integrations?.some((integration) => isActiveIntegration(integration, providerType))
          ? 'completed'
          : 'pending',
      },
      {
        id: StepIdEnum.INVITE_TEAM_MEMBER,
        title: 'Invite a team member',
        description: 'Collaborate with your team to manage notifications',
        status: hasInvitedTeamMember ? 'completed' : 'pending',
      },
    ],
    [hasInvitedTeamMember, providerType, integrations, hasCreatedWorkflow]
  );

  return {
    steps,
    providerType,
    totalSteps: steps.length,
    completedSteps: steps.filter((step) => step.status === 'completed').length,
  };
}
