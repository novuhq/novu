import { CreateEnvironment } from './create-environment/create-environment.usecase';
import { GenerateUniqueApiKey } from './generate-unique-api-key/generate-unique-api-key.usecase';
import { GetApiKeys } from './get-api-keys/get-api-keys.usecase';
import { RegenerateApiKeys } from './regenerate-api-keys/regenerate-api-keys.usecase';
import { GetEnvironment } from './get-environment';
import { GetMyEnvironments } from './get-my-environments/get-my-environments.usecase';
import { UpdateEnvironment } from './update-environment/update-environment.usecase';
import { GetMxRecord } from '../../inbound-parse/usecases/get-mx-record/get-mx-record.usecase';

export const USE_CASES = [
  //
  GetMxRecord,
  CreateEnvironment,
  UpdateEnvironment,
  GenerateUniqueApiKey,
  GetApiKeys,
  RegenerateApiKeys,
  GetEnvironment,
  GetMyEnvironments,
];
