import type { SetOrgMfaRequirementDto } from '@novu/shared';
import { post } from './api.client';

export async function setOrgMfaRequirement(body: SetOrgMfaRequirementDto): Promise<{ id: string }> {
  return post('/clerk/organization/mfa-requirement', { body });
}
