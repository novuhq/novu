import { ChatProviderIdEnum, type ICredentials } from '@novu/shared';
import { useMemo } from 'react';
import { RiArrowRightUpLine } from 'react-icons/ri';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { API_HOSTNAME } from '@/config';
import {
  AgentConnectedDetailsShell,
  DetailSection,
  FieldSkeleton,
  ReadOnlyField,
  SectionLinkButton,
} from './agent-connected-details-shell';

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

export function SlackAgentConnectedDetails({
  agent,
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
  justConnected = false,
}: SlackAgentConnectedDetailsProps) {
  const webhookUrl = buildWebhookUrl(agent._id, integrationLink.integration.identifier);

  return (
    <AgentConnectedDetailsShell
      agent={agent}
      integrationLink={integrationLink}
      providerId={ChatProviderIdEnum.Slack}
      providerDisplayName="Slack"
      canRemoveIntegration={canRemoveIntegration}
      onRequestRemoveIntegration={onRequestRemoveIntegration}
      isRemovingIntegration={isRemovingIntegration}
      justConnected={justConnected}
    >
      {({ credentials, integrationName, isLoading }) => {
        const applicationId = (credentials?.applicationId as string | undefined) ?? '';
        const slackAppName = integrationName ?? integrationLink.integration.name;
        const manageSlackAppUrl = applicationId
          ? `${MANAGE_SLACK_APP_BASE_URL}/${applicationId}`
          : MANAGE_SLACK_APP_BASE_URL;

        return (
          <SlackDetailSections
            credentials={credentials}
            isLoading={isLoading}
            applicationId={applicationId}
            slackAppName={slackAppName}
            manageSlackAppUrl={manageSlackAppUrl}
            webhookUrl={webhookUrl}
          />
        );
      }}
    </AgentConnectedDetailsShell>
  );
}

function SlackDetailSections({
  credentials,
  isLoading,
  applicationId,
  slackAppName,
  manageSlackAppUrl,
  webhookUrl,
}: {
  credentials?: ICredentials;
  isLoading: boolean;
  applicationId: string;
  slackAppName: string;
  manageSlackAppUrl: string;
  webhookUrl: string;
}) {
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
    <>
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
    </>
  );
}
