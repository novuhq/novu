import { faker } from '@faker-js/faker';
import { UserEntity, UserRepository } from '@novu/dal';
import { normalizeEmail } from '@novu/shared';
import * as bcrypt from 'bcrypt';

import { EnvironmentService } from './environment.service';
import { OrganizationService } from './organization.service';

export class UserService {
  private environmentService = new EnvironmentService();
  private organizationService = new OrganizationService();
  private userRepository = new UserRepository();

  async createTestUser(): Promise<UserEntity> {
    const user = await this.createUser({
      email: faker.internet.email(),
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      password: this.randomPassword(),
    });

    const organization = await this.organizationService.createOrganization();

    await this.organizationService.addMember(organization._id, user._id);

    await this.environmentService.createEnvironment(organization._id, user._id);

    return user;
  }

  async createUser(userEntity?: Partial<UserEntity>): Promise<UserEntity> {
    const password = userEntity?.password ?? faker.internet.password();
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.userRepository.create({
      email: normalizeEmail(userEntity?.email ?? faker.internet.email()),
      firstName: userEntity?.firstName ?? faker.name.firstName(),
      lastName: userEntity?.lastName ?? faker.name.lastName(),
      password: passwordHash,
      profilePicture: `https://randomuser.me/api/portraits/men/${Math.floor(Math.random() * 60) + 1}.jpg`,
      tokens: [],
      showOnBoardingTour: userEntity?.showOnBoardingTour ?? 2,
    });

    return user;
  }

  async getUser(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      _id: id,
    });

    if (!user) {
      throw new Error(`Test user with ${id} not found`);
    }

    return user;
  }

  randomEmail(): string {
    return faker.internet.email();
  }

  // Not so random, but meets the password policy requirements
  randomPassword(): string {
    return 'asd#Faf4fd';
  }
}
