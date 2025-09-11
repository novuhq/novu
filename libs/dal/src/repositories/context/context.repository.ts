import type { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepository } from '../base-repository';
import { ContextDBModel, ContextEntity } from './context.entity';
import { Context } from './context.schema';

export class ContextRepository extends BaseRepository<ContextDBModel, ContextEntity, EnforceEnvOrOrgIds> {
  constructor() {
    super(Context, ContextEntity);
  }
}
