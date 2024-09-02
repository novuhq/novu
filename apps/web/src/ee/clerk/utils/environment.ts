import type {
  UserPublicMetadata as _UserPublicMetadata,
  OrganizationPublicMetadata as _OrganizationPublicMetadata,
} from '@novu/shared';

declare global {
  interface UserPublicMetadata extends _UserPublicMetadata {}

  interface OrganizationPublicMetadata extends _OrganizationPublicMetadata {}
}
