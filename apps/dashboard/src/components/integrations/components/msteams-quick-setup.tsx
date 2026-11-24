import { RiArrowRightUpLine } from 'react-icons/ri';
import type { HealthCheckStatus, MsTeamsHealthCheckResult } from '@/api/integrations';
import { SetupButton, SetupStep, SetupStepperRail } from '@/components/agents/setup-guide-primitives';
import { cn } from '@/utils/ui';
import { downloadTeamsPackage, TEAMS_ADMIN_CENTER_APPS_URL } from './utils/msteams-app-package';

type MsTeamsQuickSetupProps = {
  /** The client ID of the app registration Novu created, once its credentials are saved. */
  appId?: string;
  /** The latest readiness of the Azure resources; undefined until "Set Up Azure" has run. */
  health?: MsTeamsHealthCheckResult;
  isStarting: boolean;
  /** True once the Microsoft sign-in was opened. */
  isStarted: boolean;
  /** True when the sign-in tab is gone and nothing was saved: it was closed, denied, or the setup failed. */
  isStalled: boolean;
  /** False while the form can't create the integration yet, e.g. its name is empty. */
  canStart: boolean;
  /** The integration's name, used as the bot's name in the app package. */
  appName: string;
  onSetUpAzure: () => void;
};

const AZURE_CHECKS: { key: 'appRegistration' | 'azureBotCreated' | 'permissions'; label: string }[] = [
  { key: 'appRegistration', label: 'App Registration and credentials' },
  { key: 'azureBotCreated', label: 'Bot Service with the Teams channel' },
  { key: 'permissions', label: 'Graph permissions' },
];

const CHECK_STATUS_LABELS: Record<HealthCheckStatus, string> = {
  ready: 'Ready',
  pending: 'Waiting…',
  failed: 'Failed',
};

/**
 * Quick setup for Microsoft Teams: an Azure admin signs in and Novu creates the app registration, the bot
 * and its Teams channel, and saves the credentials. The app package then goes into Teams by hand.
 */
export function MsTeamsQuickSetup({
  appId,
  health,
  isStarting,
  isStarted,
  isStalled,
  canStart,
  appName,
  onSetUpAzure,
}: MsTeamsQuickSetupProps) {
  const isAzureReady = AZURE_CHECKS.every((check) => health?.[check.key] === 'ready');

  return (
    <SetupStepperRail className="-ml-3 pb-4">
      <SetupStep
        index={1}
        status={isAzureReady ? 'completed' : 'current'}
        title="Set Up Azure"
        description="Sign in with an Azure admin account. Novu creates everything in your tenant and saves the credentials."
        extraContent={
          <>
            <div className="bg-bg-weak border-stroke-weak flex items-stretch gap-3 rounded-lg border px-3 py-2.5">
              <span className="w-1 shrink-0 rounded-full bg-[#717784]" aria-hidden="true" />
              <p className="text-label-xs text-text-strong">
                What Novu does automatically: creates the App Registration and the Bot Service resource, enables the
                Teams channel, and grants the required Graph permissions.
              </p>
            </div>
            {!isAzureReady && (
              <SetupButton onClick={onSetUpAzure} disabled={!canStart || isStarting} className="self-start">
                {isStarting ? 'Opening Microsoft…' : 'Set Up Azure'}
                <RiArrowRightUpLine className="ml-1.5 size-3 shrink-0" />
              </SetupButton>
            )}
            {isStarted && (
              <ul className="flex flex-col gap-1.5" aria-live="polite">
                {AZURE_CHECKS.map((check) => {
                  const status = health?.[check.key] ?? 'pending';

                  return (
                    <li key={check.key} className="text-label-xs flex items-center justify-between gap-3">
                      <span className="text-text-sub">{check.label}</span>
                      <span
                        className={cn(
                          'shrink-0',
                          status === 'ready' && 'text-success-base',
                          status === 'pending' && 'text-text-soft',
                          status === 'failed' && 'text-error-base'
                        )}
                      >
                        {CHECK_STATUS_LABELS[status]}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {isStalled && (
              <p className="text-label-xs text-error-base" role="alert">
                Microsoft sign-in ended and nothing was saved. If it was closed or denied, run Set Up Azure again.
              </p>
            )}
          </>
        }
      />
      <SetupStep
        index={2}
        status={health?.teamsAppCatalog === 'ready' ? 'completed' : 'current'}
        dimmed={!appId}
        title="Publish the bot in Teams"
        description="Upload the app package in Teams Admin Center, allow it in your permission policy, then grant admin consent for the tenant."
        extraContent={
          <div className="flex flex-wrap items-center gap-2">
            <SetupButton onClick={() => appId && downloadTeamsPackage(appId, appName)} disabled={!appId}>
              Download app package
            </SetupButton>
            <SetupButton href={TEAMS_ADMIN_CENTER_APPS_URL} disabled={!appId}>
              Open Teams Admin Center
            </SetupButton>
          </div>
        }
      />
    </SetupStepperRail>
  );
}
