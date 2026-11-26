import type { IEnvironment, IOrganizationCopilotSettings, UpdateExternalOrganizationDto } from '@novu/shared';
import { get, patch, post } from './api.client';

export type GetOrganizationSettingsDto = {
  removeNovuBranding: boolean;
  defaultLocale: string;
  targetLocales: string[];
};

export type UpdateOrganizationSettingsDto = {
  removeNovuBranding?: boolean;
  defaultLocale?: string;
  targetLocales?: string[];
};

export async function getOrganizationSettings({
  environment,
}: {
  environment: IEnvironment;
}): Promise<{ data: GetOrganizationSettingsDto }> {
  return get('/organizations/settings', { environment });
}

export async function updateOrganizationSettings({
  data,
  environment,
}: {
  data: UpdateOrganizationSettingsDto;
  environment: IEnvironment;
}): Promise<{ data: GetOrganizationSettingsDto }> {
  return patch('/organizations/settings', { environment, body: data });
}

export type CopilotSettings = Required<IOrganizationCopilotSettings>;

export async function getCopilotSettings({
  environment,
  signal,
}: {
  environment: IEnvironment;
  signal?: AbortSignal;
}): Promise<{ data: CopilotSettings }> {
  return get('/organizations/settings/copilot', { environment, signal });
}

export async function updateCopilotSettings({
  data,
  environment,
}: {
  data: IOrganizationCopilotSettings;
  environment: IEnvironment;
}): Promise<{ data: CopilotSettings }> {
  return patch('/organizations/settings/copilot', { environment, body: data });
}

// Writes onboarding metadata (e.g. productUseCases) onto the external (Clerk) organization
// and the internal Mongo organization. Org context is resolved server-side from the session.
export async function updateExternalOrganization(data: UpdateExternalOrganizationDto): Promise<unknown> {
  return post('/clerk/organization', { body: data });
}
