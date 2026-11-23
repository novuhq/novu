import { AnimatePresence, motion } from 'motion/react';
import { type ReactNode, useMemo, useState } from 'react';
import { RiFileCopyLine } from 'react-icons/ri';
import { SetupButton, SetupStep, SetupStepperRail } from '@/components/agents/setup-guide-primitives';
import { CodeBlock } from '@/components/primitives/code-block';
import { getAgentApiBaseUrl } from '@/config';
import { useAuth } from '@/context/auth/hooks';

const SLACK_APPS_URL = 'https://api.slack.com/apps';
const SLACK_NOTIFICATIONS_DEFAULT_DESCRIPTION = 'Notifications sent with Novu';
/** Same as the API's `SLACK_DEFAULT_OAUTH_SCOPES` plus `incoming-webhook`, as in the Quick setup manifest. */
const SLACK_NOTIFICATION_BOT_SCOPES = [
  'chat:write',
  'chat:write.public',
  'channels:read',
  'groups:read',
  'users:read',
  'users:read.email',
  'incoming-webhook',
];

function escapeYamlDoubleQuoted(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Slack rejects names that contain the word "slack". */
function sanitizeAppName(name: string): string {
  const sanitized = name.replace(/slack/gi, '').trim();

  return sanitized.length > 0 ? sanitized : 'Novu Bot';
}

/** The notifications app manifest Quick setup creates on the server, as YAML for Slack's "From a manifest". */
function buildSlackNotificationManifestYaml(appName: string): string {
  const name = escapeYamlDoubleQuoted(sanitizeAppName(appName));
  const redirectUrl = escapeYamlDoubleQuoted(`${getAgentApiBaseUrl()}/v1/integrations/chat/oauth/callback`);
  const scopesYaml = SLACK_NOTIFICATION_BOT_SCOPES.map((scope) => `      - ${scope}`).join('\n');

  return `display_information:
  name: "${name}"
  description: "${SLACK_NOTIFICATIONS_DEFAULT_DESCRIPTION}"

features:
  bot_user:
    display_name: "${name}"
    always_online: true

oauth_config:
  redirect_urls:
    - "${redirectUrl}"
  scopes:
    bot:
${scopesYaml}

settings:
  org_deploy_enabled: false
  socket_mode_enabled: false
  token_rotation_enabled: false`;
}

type SlackManualSetupProps = {
  /** The App ID typed in the credentials step, used to open the app's Manage Distribution page. */
  appId?: string;
  /** The Slack app credential fields. */
  credentialFields: ReactNode;
};

/**
 * Manual setup for Slack: create the app from a pre-filled manifest, paste its credentials, then turn on
 * public distribution in Slack.
 */
export function SlackManualSetup({ appId, credentialFields }: SlackManualSetupProps) {
  const { currentOrganization } = useAuth();
  const [showManifest, setShowManifest] = useState(false);
  const manifestYaml = useMemo(
    () => buildSlackNotificationManifestYaml(currentOrganization?.name ?? ''),
    [currentOrganization?.name]
  );
  const createSlackAppUrl = `${SLACK_APPS_URL}?new_app=1&manifest_yaml=${encodeURIComponent(manifestYaml)}`;
  const trimmedAppId = appId?.trim();

  return (
    <SetupStepperRail className="-ml-3 pb-4">
      <SetupStep
        index={1}
        status="current"
        title="Create Slack App via Manifest"
        description="Opens Slack with a pre-filled manifest: scopes, redirect URL and events are already set."
        extraContent={
          <div className="flex items-center gap-2">
            <SetupButton href={createSlackAppUrl}>Create slack app</SetupButton>
            <button
              type="button"
              aria-expanded={showManifest}
              onClick={() => setShowManifest((prev) => !prev)}
              className="text-label-xs text-text-sub hover:text-text-strong flex items-center gap-1 transition-colors"
            >
              <span className="flex size-4 items-center justify-center">
                <RiFileCopyLine className="size-3" />
              </span>
              {showManifest ? 'Hide manifest' : 'Show manifest'}
            </button>
          </div>
        }
        fullWidthContent={
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
        }
      />
      <SetupStep
        index={2}
        status="current"
        title="Paste the app credentials"
        description="Find these under Basic Information in your Slack app."
        extraContent={credentialFields}
      />
      <SetupStep
        index={3}
        status="current"
        title="Enable Slack Public Distribution"
        description="Let workspaces outside yours install the app. Turn it on in Manage Distribution."
        extraContent={
          <SetupButton href={trimmedAppId ? `${SLACK_APPS_URL}/${trimmedAppId}/distribute` : SLACK_APPS_URL}>
            Enable Slack App
          </SetupButton>
        }
      />
    </SetupStepperRail>
  );
}
