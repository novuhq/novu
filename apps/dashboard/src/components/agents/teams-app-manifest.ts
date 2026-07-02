import { getAgentApiHostname } from '@/config';

/**
 * Builds the Microsoft Teams app manifest for a Novu agent bot.
 *
 * Must stay in sync with the API-side builder in
 * `apps/api/src/app/integrations/utils/msteams-manifest.ts`. Developer URLs must be valid HTTPS
 * URLs or Teams rejects the package on upload (and AppSource validation fails).
 */
export function buildTeamsManifest(appId: string, agentName: string): Record<string, unknown> {
  const id = appId || 'YOUR_APP_ID';
  const name = agentName || 'Novu Agent';
  const hostname = getAgentApiHostname();

  return {
    $schema: 'https://developer.microsoft.com/json-schemas/teams/v1.16/MicrosoftTeams.schema.json',
    manifestVersion: '1.16',
    version: '1.0.0',
    id,
    developer: {
      name: 'Novu',
      websiteUrl: 'https://novu.co',
      privacyUrl: 'https://novu.co/privacy',
      termsOfUseUrl: 'https://novu.co/terms',
    },
    name: { short: name, full: `${name}, powered by Novu` },
    description: { short: `${name} bot`, full: 'A conversational agent powered by Novu.' },
    icons: { outline: 'outline.png', color: 'color.png' },
    accentColor: '#FFFFFF',
    bots: [
      {
        botId: id,
        scopes: ['personal', 'team', 'groupchat'],
        supportsFiles: false,
        isNotificationOnly: false,
      },
    ],
    permissions: ['identity', 'messageTeamMembers'],
    validDomains: [hostname],
    webApplicationInfo: { id, resource: `api://${hostname}/${id}` },
    authorization: {
      permissions: {
        resourceSpecific: [{ name: 'ChannelMessage.Read.Group', type: 'Application' }],
      },
    },
  };
}
