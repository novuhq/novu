import { UserEntity, UserRepository } from '@novu/dal';

import { getEERepository } from './ee.repository.factory';

export class EEUserService {
  private userRepository = getEERepository<UserRepository>('UserRepository');

  async createUser(userId: string): Promise<UserEntity> {
    // link external user to newly created internal user
    const user = await this.userRepository.create({}, { linkOnly: true, externalId: userId });

    return user;
  }

  async getUser(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new Error(`Test user with ${id} not found`);
    }

    return user;
  }
}
