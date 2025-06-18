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

  async findByWorkflowAndLocale(workflowId: string, locale: string, environmentId: string, organizationId: string) {
    return this.findOne({
      _workflowId: workflowId,
      locale,
      _environmentId: environmentId,
      _organizationId: organizationId,
    });
  }

  async findByWorkflow(workflowId: string, environmentId: string, organizationId: string) {
    return this.find({
      _workflowId: workflowId,
      _environmentId: environmentId,
      _organizationId: organizationId,
    });
  }

  async findByLocale(locale: string, environmentId: string, organizationId: string) {
    return this.find({
      locale,
      _environmentId: environmentId,
      _organizationId: organizationId,
    });
  }

  async getAllLocalizations(environmentId: string, organizationId: string) {
    return this.find({
      _environmentId: environmentId,
      _organizationId: organizationId,
    });
  }
}
