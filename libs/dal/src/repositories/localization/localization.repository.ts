import { BaseRepository } from '../base-repository';
import { LocalizationEntity, LocalizationDBModel } from './localization.entity';
import { Localization } from './localization.schema';
import type { EnforceEnvOrOrgIds } from '../../types/enforce';

export class LocalizationRepository extends BaseRepository<
  LocalizationDBModel,
  LocalizationEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(Localization, LocalizationEntity);
  }
}
