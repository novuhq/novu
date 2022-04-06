import { UpdateBrandingDetails } from './update-branding-details/update-branding-details.usecase';
import { CreateEnvironment } from './create-environment/create-environment.usecase';
import { GetApiKeys } from './get-api-keys/get-api-keys.usecase';
import { GetEnvironment } from './get-environment';

export const USE_CASES = [
  //
  CreateEnvironment,
  GetApiKeys,
  GetEnvironment,
  UpdateBrandingDetails,
];
