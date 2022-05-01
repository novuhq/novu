import { CreateEnvironment } from './create-environment/create-environment.usecase';
import { GetApiKeys } from './get-api-keys/get-api-keys.usecase';
import { GetEnvironment } from './get-environment';
import { GetMyEnvironments } from './get-my-environments/get-my-environments.usecase';
import { UpdateWidgetSettings } from './update-widget-settings/update-widget-settings.usecase';

export const USE_CASES = [
  //
  CreateEnvironment,
  GetApiKeys,
  GetEnvironment,
  GetMyEnvironments,
  UpdateWidgetSettings,
];
