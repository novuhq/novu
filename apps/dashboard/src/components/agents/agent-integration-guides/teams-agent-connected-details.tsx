import { ChatProviderIdEnum, type ICredentials } from '@novu/shared';
import { useMemo } from 'react';
import { RiArrowRightUpLine } from 'react-icons/ri';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import { getAgentApiBaseUrl } from '@/config';
import {
  AgentConnectedDetailsShell,
  DetailSection,
  FieldSkeleton,
  ReadOnlyField,
  SectionLinkButton,
} from './agent-connected-details-shell';

type TeamsAgentConnectedDetailsProps = {
  agent: AgentResponse;
  integrationLink: AgentIntegrationLink;
  canRemoveIntegration: boolean;
  onRequestRemoveIntegration?: () => void;
  isRemovingIntegration?: boolean;
  /**
   * True when the integration connected during this session and we just transitioned in from the
   * setup guide - drives the one-shot celebration so the "success" moment carries over instead of
   * being dropped when the setup card animates away.
   */
  justConnected?: boolean;
};

const MANAGE_AZURE_APP_URL =
  'https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps';

function buildWebhookUrl(agentId: string, integrationIdentifier: string): string {
  return `${getAgentApiBaseUrl()}/v1/agents/${agentId}/webhook/${integrationIdentifier}`;
}

export function TeamsAgentConnectedDetails({
  agent,
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
  justConnected = false,
}: TeamsAgentConnectedDetailsProps) {
  const webhookUrl = buildWebhookUrl(agent._id, integrationLink.integration.identifier);

  return (
    <AgentConnectedDetailsShell
      agent={agent}
      integrationLink={integrationLink}
      providerId={ChatProviderIdEnum.MsTeams}
      providerDisplayName="MS Teams"
      canRemoveIntegration={canRemoveIntegration}
      onRequestRemoveIntegration={onRequestRemoveIntegration}
      isRemovingIntegration={isRemovingIntegration}
      justConnected={justConnected}
    >
      {({ credentials, integrationName, isLoading }) => (
        <TeamsDetailSections
          credentials={credentials}
          isLoading={isLoading}
          teamsAppName={integrationName ?? integrationLink.integration.name}
          webhookUrl={webhookUrl}
        />
      )}
    </AgentConnectedDetailsShell>
  );
}

function TeamsDetailSections({
  credentials,
  isLoading,
  teamsAppName,
  webhookUrl,
}: {
  credentials?: ICredentials;
  isLoading: boolean;
  teamsAppName: string;
  webhookUrl: string;
}) {
  const appId = (credentials?.clientId as string | undefined) ?? '';

  const credentialFields = useMemo(
    () => [
      {
        key: 'clientId' as keyof ICredentials,
        label: 'Microsoft App ID',
        value: appId,
        secret: false,
      },
      {
        key: 'tenantId' as keyof ICredentials,
        label: 'Directory (tenant) ID',
        value: (credentials?.tenantId as string | undefined) ?? '',
        secret: false,
      },
      {
        key: 'secretKey' as keyof ICredentials,
        label: 'Client Secret',
        value: (credentials?.secretKey as string | undefined) ?? '',
        secret: true,
      },
    ],
    [appId, credentials?.tenantId, credentials?.secretKey]
  );

  return (
    <>
      <DetailSection
        title="Teams app metadata"
        action={
          <SectionLinkButton icon={RiArrowRightUpLine} href={MANAGE_AZURE_APP_URL}>
            Manage in Azure
          </SectionLinkButton>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ReadOnlyField
            label="Teams app name"
            value={teamsAppName}
            mono={false}
            info="The display name of your connected MS Teams app."
          />
          {isLoading ? (
            <FieldSkeleton />
          ) : (
            <ReadOnlyField
              label="Microsoft App ID"
              value={appId}
              info="The Application (client) ID of your Azure app."
            />
          )}
        </div>
        <ReadOnlyField
          label="Messaging endpoint (webhook URL)"
          value={webhookUrl}
          copyable
          info="Set this as the messaging endpoint on your Azure Bot. It receives Teams messages for this agent."
        />
      </DetailSection>

      <DetailSection title="Teams credentials">
        {isLoading ? (
          <>
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
