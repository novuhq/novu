import { CommunityUserRepository } from './community.user.repository';
import { IUserRepository } from './user-repository.interface';

let instance: IUserRepository;

export function createUserRepository(): IUserRepository {
  if (!instance) {
    if (process.env.NOVU_ENTERPRISE === 'true') {
      const eeAuthPackage = require('@novu/ee-auth');
      if (!eeAuthPackage?.EEUserRepository) {
        throw new Error('EEUserRepository is not loaded');
      }
      instance = new eeAuthPackage.EEUserRepository();
    } else {
      instance = new CommunityUserRepository();
    }
  }

  return instance;
}
