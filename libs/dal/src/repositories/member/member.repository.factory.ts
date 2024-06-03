import { CommunityMemberRepository } from './community.member.repository';
import { IMemberRepository } from './member-repository.interface';

let instance: IMemberRepository;

export function createMemberRepository(): IMemberRepository {
  if (!instance) {
    if (process.env.NOVU_ENTERPRISE === 'true') {
      const eeAuthPackage = require('@novu/ee-auth');
      if (!eeAuthPackage?.EEMemberRepository) {
        throw new Error('EEMemberRepository is not loaded');
      }
      instance = new eeAuthPackage.EEMemberRepository();
    } else {
      instance = new CommunityMemberRepository();
    }
  }

  return instance;
}
