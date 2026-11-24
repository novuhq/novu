import { useId, useState } from 'react';
import { SetupButton, SetupStep, SetupStepperRail } from '@/components/agents/setup-guide-primitives';
import { Input } from '@/components/primitives/input';
import { SecretInput } from '@/components/primitives/secret-input';
import { useAuth } from '@/context/auth/hooks';

const SLACK_APPS_URL = 'https://api.slack.com/apps';
/** Slack's limit for an app name in a manifest. */
const SLACK_APP_NAME_MAX_LENGTH = 35;

type SlackQuickSetupProps = {
  /** The Slack app Novu created, once "Create app" has run. */
  appId?: string;
  isCreating: boolean;
  /** False while the form can't create the integration yet, e.g. its name is empty. */
  canCreate: boolean;
  onCreateApp: (configToken: string, appName: string) => void;
};

/**
 * Quick setup for Slack: paste an App Configuration Token and Novu creates the Slack app and saves its
 * credentials, then the user turns on public distribution in Slack.
 */
export function SlackQuickSetup({ appId, isCreating, canCreate, onCreateApp }: SlackQuickSetupProps) {
  const fieldId = useId();
  const appNameFieldId = useId();
  const { currentOrganization } = useAuth();
  const [configToken, setConfigToken] = useState('');
  // The organization's name is a better start than the integration's "Slack", which Slack won't take.
  const [appName, setAppName] = useState(() => (currentOrganization?.name ?? '').slice(0, SLACK_APP_NAME_MAX_LENGTH));
  const isCreated = !!appId;
  const trimmedToken = configToken.trim();
  const trimmedAppName = appName.trim();
  const hasSlackInName = /slack/i.test(trimmedAppName);
  const isReady = !!trimmedToken && !!trimmedAppName && !hasSlackInName && canCreate && !isCreating;

  const createApp = () => {
    if (!isReady) return;
    onCreateApp(trimmedToken, trimmedAppName);
  };

  // The fields sit inside the integration form; Enter creates the app instead of submitting it.
  const createOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    createApp();
  };

  return (
    <SetupStepperRail className="-ml-3 pb-4">
      <SetupStep
        index={1}
        status={isCreated ? 'completed' : 'current'}
        title="Create Slack App automatically"
        description="Generate an App Configuration Token in Slack and paste it here. Novu uses it once to create the app and save its credentials."
        extraContent={
          isCreated ? null : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor={appNameFieldId} className="text-label-xs text-text-sub">
                  App name <span className="text-primary-base">*</span>
                </label>
                <Input
                  id={appNameFieldId}
                  size="xs"
                  autoComplete="off"
                  placeholder="e.g. Acme Notifications"
                  maxLength={SLACK_APP_NAME_MAX_LENGTH}
                  hasError={hasSlackInName}
                  value={appName}
                  onChange={(event) => setAppName(event.target.value)}
                  onKeyDown={createOnEnter}
                />
                <p className={hasSlackInName ? 'text-label-xs text-error-base' : 'text-paragraph-xs text-text-soft'}>
                  {hasSlackInName
                    ? 'Slack doesn’t allow the word “Slack” in app names.'
                    : 'What your subscribers see in Slack when it sends them a message.'}
                </p>
              </div>
              <SetupButton href={SLACK_APPS_URL}>Slack App Configuration Token</SetupButton>
              <div className="flex items-end gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <label htmlFor={fieldId} className="text-label-xs text-text-sub">
                    App Configuration Token <span className="text-primary-base">*</span>
                  </label>
                  <SecretInput
                    id={fieldId}
                    size="xs"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="xoxe.xoxp-1-..."
                    className="font-code"
                    value={configToken}
                    onChange={setConfigToken}
                    onKeyDown={createOnEnter}
                  />
                </div>
                <SetupButton onClick={createApp} disabled={!isReady}>
                  {isCreating ? 'Creating…' : 'Create app'}
                </SetupButton>
              </div>
            </div>
          )
        }
      />
      <SetupStep
        index={2}
        status="current"
        dimmed={!isCreated}
        title="Enable Slack Public Distribution"
        description="Let workspaces outside yours install the app. Turn it on in Manage Distribution."
        extraContent={
          <SetupButton href={appId ? `${SLACK_APPS_URL}/${appId}/distribute` : SLACK_APPS_URL} disabled={!isCreated}>
            Enable Slack App
          </SetupButton>
        }
      />
    </SetupStepperRail>
  );
}
