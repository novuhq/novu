import { FilterQuery } from 'mongoose';

import { IntegrationDBModel } from './integration.entity';

import type { EnforceEnvOrOrgIds } from '../../types/enforce';

export type IntegrationQuery = FilterQuery<IntegrationDBModel> & EnforceEnvOrOrgIds;
