import type { IEnvironment, UpdateExternalOrganizationDto } from '@novu/shared';
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

// Writes onboarding metadata (e.g. productUseCases) onto the external (Clerk) organization.
// Org context is resolved server-side from the session, so no environment is required.
export async function updateExternalOrganization(data: UpdateExternalOrganizationDto): Promise<unknown> {
  return post('/clerk/organization', { body: data });
}
