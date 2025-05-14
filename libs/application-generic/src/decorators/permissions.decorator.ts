import { SetMetadata } from '@nestjs/common';
import { PermissionsEnum } from '@novu/shared';

export const PERMISSIONS_KEY = 'permissions';
export const RequiresPermissions = (...permissions: PermissionsEnum[]) => {
  return SetMetadata(PERMISSIONS_KEY, permissions);
};
