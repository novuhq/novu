import { UpdateBrandingDetails } from './update-branding-details/update-branding-details.usecase';
import { CreateApplication } from './create-application/create-application.usecase';
import { GetApiKeys } from './get-api-keys/get-api-keys.usecase';
import { GetApplication } from './get-application';

export const USE_CASES = [
  //
  CreateApplication,
  GetApiKeys,
  GetApplication,
  UpdateBrandingDetails,
];
