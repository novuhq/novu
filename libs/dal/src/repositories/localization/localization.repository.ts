import type { EnforceEnvOrOrgIds } from '../../types/enforce';
import { BaseRepository } from '../base-repository';
import { LocalizationDBModel, LocalizationEntity } from './localization.entity';
import { Localization } from './localization.schema';

export class LocalizationRepository extends BaseRepository<
  LocalizationDBModel,
  LocalizationEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(Localization, LocalizationEntity);
  }
}
