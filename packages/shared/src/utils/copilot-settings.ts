import { IOrganizationCopilotSettings } from '../entities/organization/organization.interface';

/** The organization's Copilot switches, each on unless an admin turned it off. */
export function resolveCopilotSettings(
  settings: IOrganizationCopilotSettings | null | undefined
): Required<IOrganizationCopilotSettings> {
  return {
    dashboardEnabled: settings?.dashboardEnabled ?? true,
    slackEnabled: settings?.slackEnabled ?? true,
    editsEnabled: settings?.editsEnabled ?? true,
  };
}
