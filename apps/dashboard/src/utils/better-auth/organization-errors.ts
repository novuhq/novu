const ORGANIZATION_CREATION_RESTRICTED_CODE = 'YOU_ARE_NOT_ALLOWED_TO_CREATE_A_NEW_ORGANIZATION';

export const ORGANIZATION_CREATION_RESTRICTED_MESSAGE =
  'Organization creation is restricted on this instance. Ask your administrator to create the organization or invite you to an existing one.';

type BetterAuthClientError = { code?: string; message?: string } | null | undefined;

export function getCreateOrganizationErrorMessage(error: BetterAuthClientError): string {
  if (error?.code === ORGANIZATION_CREATION_RESTRICTED_CODE) {
    return ORGANIZATION_CREATION_RESTRICTED_MESSAGE;
  }

  return error?.message || 'Failed to create organization';
}
