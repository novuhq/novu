import { env } from '../../config/env';

export function isKeylessOrganization(organizationId: string): boolean {
  const keylessOrganizationId = env.KEYLESS_ORGANIZATION_ID;

  return Boolean(keylessOrganizationId && organizationId === keylessOrganizationId);
}
