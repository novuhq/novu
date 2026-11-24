import { buildTeamsManifest } from '@/components/agents/teams-app-manifest';
import { downloadTeamsAppPackage } from '@/components/agents/teams-app-package';

export const TEAMS_ADMIN_CENTER_APPS_URL = 'https://admin.teams.microsoft.com/policies/manage-apps';

/** Downloads the Teams app package (manifest and icons) for the bot with this Microsoft App ID. */
export function downloadTeamsPackage(appId: string, appName: string) {
  void downloadTeamsAppPackage(JSON.stringify(buildTeamsManifest(appId, appName), null, 2), appName);
}
