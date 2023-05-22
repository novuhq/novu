import { faker } from '@faker-js/faker';
import { UserEntity, UserRepository } from '@novu/dal';
import * as bcrypt from 'bcrypt';

import { EnvironmentService } from './environment.service';
import { OrganizationService } from './organization.service';

export class UserService {
  private environmentService = new EnvironmentService();
  private organizationService = new OrganizationService();
  private userRepository = new UserRepository();

  async createTestUser(): Promise<UserEntity> {
    const data = {
      email: 'test-user-1@example.com',
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      password: '123qwe!@#',
      organizationName: 'Test Organization',
    };

    const user = await this.createUser(data);

    const organization = await this.organizationService.createOrganization();

    await this.organizationService.addMember(organization._id, user._id);

    await this.environmentService.createEnvironment(organization._id);

    return user;
  }

  async createUser(userEntity: Partial<UserEntity>): Promise<UserEntity> {
    const passwordHash = await bcrypt.hash(userEntity.password, 10);

    const user = await this.userRepository.create({
      email: userEntity.email,
      firstName: userEntity.firstName,
      lastName: userEntity.lastName,
      password: passwordHash,
      profilePicture: `https://randomuser.me/api/portraits/men/${Math.floor(Math.random() * 60) + 1}.jpg`,
      tokens: [],
    });

    return user;
  }

  async getUser(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      _id: id,
    });

    return user;
  }
}
