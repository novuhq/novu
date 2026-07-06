/**
 * Builds the Microsoft Teams app manifest for a Novu agent bot.
 *
 * The manifest must be valid for cross-tenant distribution: every developer URL has to be a
 * well-formed HTTPS URL or Teams rejects the package on upload (and AppSource validation fails).
 * Publisher identity is configurable via env so a Novu user can ship the package under their own
 * brand to their customers; the defaults are valid Novu-branded URLs rather than placeholders.
 */

export type MsTeamsPublisherInfo = {
  name: string;
  websiteUrl: string;
  privacyUrl: string;
  termsOfUseUrl: string;
};

export function resolveMsTeamsPublisherInfo(): MsTeamsPublisherInfo {
  const websiteUrl = process.env.NOVU_MSTEAMS_PUBLISHER_WEBSITE_URL || 'https://novu.co';

  return {
    name: process.env.NOVU_MSTEAMS_PUBLISHER_NAME || 'Novu',
    websiteUrl,
    privacyUrl: process.env.NOVU_MSTEAMS_PUBLISHER_PRIVACY_URL || 'https://novu.co/privacy',
    termsOfUseUrl: process.env.NOVU_MSTEAMS_PUBLISHER_TERMS_URL || 'https://novu.co/terms',
  };
}

export function buildMsTeamsManifest(params: {
  appId: string;
  agentName: string;
  hostname: string;
  publisher?: MsTeamsPublisherInfo;
}): Record<string, unknown> {
  const { appId, agentName, hostname } = params;
  const publisher = params.publisher ?? resolveMsTeamsPublisherInfo();

  return {
    $schema: 'https://developer.microsoft.com/json-schemas/teams/v1.16/MicrosoftTeams.schema.json',
    manifestVersion: '1.16',
    version: '1.0.0',
    id: appId,
    developer: {
      name: publisher.name,
      websiteUrl: publisher.websiteUrl,
      privacyUrl: publisher.privacyUrl,
      termsOfUseUrl: publisher.termsOfUseUrl,
    },
    name: { short: agentName, full: `${agentName} — powered by Novu` },
    description: { short: `${agentName} bot`, full: 'A conversational agent powered by Novu.' },
    icons: { outline: 'outline.png', color: 'color.png' },
    accentColor: '#FFFFFF',
    bots: [
      {
        botId: appId,
        scopes: ['personal', 'team', 'groupchat'],
        supportsFiles: false,
        isNotificationOnly: false,
      },
    ],
    permissions: ['identity', 'messageTeamMembers'],
    validDomains: [hostname],
    webApplicationInfo: { id: appId, resource: `api://${hostname}/${appId}` },
    authorization: {
      permissions: {
        resourceSpecific: [{ name: 'ChannelMessage.Read.Group', type: 'Application' }],
      },
    },
  };
}
