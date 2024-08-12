/* eslint-disable @typescript-eslint/no-empty-interface */
import { _UserPublicMetadata, _OrganizationPublicMetadata } from '@novu/shared';

declare global {
  interface UserPublicMetadata extends _UserPublicMetadata {}

  interface OrganizationPublicMetadata extends _OrganizationPublicMetadata {}
}
