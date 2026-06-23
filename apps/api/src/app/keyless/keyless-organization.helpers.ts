export function isKeylessOrganization(organizationId: string): boolean {
  const keylessOrganizationId = process.env.KEYLESS_ORGANIZATION_ID;

  return Boolean(keylessOrganizationId && organizationId === keylessOrganizationId);
}
