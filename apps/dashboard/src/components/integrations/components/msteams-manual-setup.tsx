import type { ReactNode } from 'react';
import { RiArrowRightUpLine, RiInformationFill } from 'react-icons/ri';
import { SetupButton, SetupStep, SetupStepperRail } from '@/components/agents/setup-guide-primitives';
import { CopyButton } from '@/components/primitives/copy-button';
import { getAgentApiBaseUrl } from '@/config';
import { downloadTeamsPackage, TEAMS_ADMIN_CENTER_APPS_URL } from './utils/msteams-app-package';

const APP_REGISTRATIONS_URL =
  'https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps';

type MsTeamsManualSetupProps = {
  /** The Microsoft App ID typed in the credentials step, which the app package is built from. */
  appId?: string;
  /** The integration's name, used as the bot's name in the app package. */
  appName: string;
  /** The Microsoft Teams credential fields. */
  credentialFields: ReactNode;
  /** False until the App ID, client secret and tenant ID are typed: the deployment is built from them. */
  canDeploy: boolean;
  isDeploying: boolean;
  onDeployBot: () => void;
};

/**
 * Manual setup for Microsoft Teams: everything Quick setup creates, done by hand in Azure, then the same
 * app package upload.
 */
export function MsTeamsManualSetup({
  appId,
  appName,
  credentialFields,
  canDeploy,
  isDeploying,
  onDeployBot,
}: MsTeamsManualSetupProps) {
  const callbackUrl = `${getAgentApiBaseUrl()}/v1/integrations/chat/oauth/callback`;
  const trimmedAppId = appId?.trim();

  return (
    <SetupStepperRail className="-ml-3 pb-4">
      <SetupStep
        index={1}
        status="current"
        title="Create an App Registration"
        description="Register a multi-tenant app in Microsoft Entra ID. Use this URL as the redirect URI."
        extraContent={
          <>
            <div className="flex flex-col gap-1">
              <span className="text-label-xs text-text-sub">OAuth callback URL</span>
              <div className="border-stroke-soft bg-bg-white flex items-center overflow-hidden rounded-md border shadow-xs">
                <input
                  type="text"
                  readOnly
                  value={callbackUrl}
                  aria-label="OAuth callback URL"
                  className="text-text-strong font-code min-w-0 flex-1 truncate bg-transparent p-2 text-[12px] font-medium leading-4 outline-none"
                />
                <CopyButton valueToCopy={callbackUrl} size="xs" className="border-stroke-soft shrink-0 border-l" />
              </div>
              <p className="text-paragraph-xs text-text-sub flex items-start gap-1">
                <RiInformationFill className="text-text-soft size-4 shrink-0" aria-hidden="true" />
                Read only. Copy it into the redirect URI field.
              </p>
            </div>
            <SetupButton href={APP_REGISTRATIONS_URL}>Open App Registrations</SetupButton>
          </>
        }
      />
      <SetupStep
        index={2}
        status="current"
        title="Add Microsoft Graph API permissions"
        description="In API permissions, add the Graph permissions listed in the docs, then grant admin consent."
      />
      <SetupStep
        index={3}
        status="current"
        title="Paste the credentials"
        description="Find these on the app’s Overview page and under Certificates & secrets."
        extraContent={credentialFields}
      />
      <SetupStep
        index={4}
        status="current"
        title="Deploy the Azure Bot"
        description="Deploys a free F0, single-tenant bot with the messaging endpoint already filled in."
        extraContent={
          <SetupButton onClick={onDeployBot} disabled={!canDeploy || isDeploying} className="self-start">
            {isDeploying ? 'Opening Azure…' : 'Deploy to Azure'}
            <RiArrowRightUpLine className="ml-1.5 size-3 shrink-0" />
          </SetupButton>
        }
      />
      <SetupStep
        index={5}
        status="current"
        title="Publish the bot in Teams"
        description="Upload the app package in Teams Admin Center, allow it in your permission policy, then grant admin consent."
        extraContent={
          <div className="flex flex-wrap items-center gap-2">
            <SetupButton
              onClick={() => trimmedAppId && downloadTeamsPackage(trimmedAppId, appName)}
              disabled={!trimmedAppId}
            >
              Download app package
            </SetupButton>
            <SetupButton href={TEAMS_ADMIN_CENTER_APPS_URL}>Open Teams Admin Center</SetupButton>
          </div>
        }
      />
    </SetupStepperRail>
  );
}
