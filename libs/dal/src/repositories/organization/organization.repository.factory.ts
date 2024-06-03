import { CommunityOrganizationRepository } from './community.organization.repository';
import { IOrganizationRepository } from './organization-repository.interface';

let instance: IOrganizationRepository;

export function createOrganizationRepository(): IOrganizationRepository {
  if (!instance) {
    if (process.env.NOVU_ENTERPRISE === 'true') {
      const eeAuthPackage = require('@novu/ee-auth');
      if (!eeAuthPackage?.EEOrganizationRepository) {
        throw new Error('EEOrganizationRepository is not loaded');
      }
      instance = new eeAuthPackage.EEOrganizationRepository();
    } else {
      instance = new CommunityOrganizationRepository();
    }
  }

  return instance;
}
