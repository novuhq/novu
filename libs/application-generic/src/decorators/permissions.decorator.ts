import { SetMetadata } from '@nestjs/common';
import { PermissionsEnum } from '@novu/shared';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: PermissionsEnum[]) => {
  return SetMetadata(PERMISSIONS_KEY, permissions);
};

export const NO_PERMISSIONS_KEY = 'no_permissions_required';
export const SkipPermissionsCheck = () => {
  return SetMetadata(NO_PERMISSIONS_KEY, true);
};
