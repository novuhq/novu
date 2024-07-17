import { faker } from '@faker-js/faker';
import { UserEntity, CommunityUserRepository } from '@novu/dal';
import { normalizeEmail } from '@novu/shared';
import { hash } from 'bcrypt';

import { EnvironmentService } from './environment.service';
import { OrganizationService } from './organization.service';
import { TEST_USER_PASSWORD } from './constants';

export class UserService {
  private environmentService = new EnvironmentService();
  private organizationService = new OrganizationService();
  private userRepository = new CommunityUserRepository();

  async createTestUser(): Promise<UserEntity> {
    const user = await this.createUser({
      email: this.randomEmail(),
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      password: this.testPassword(),
    });

    const organization = await this.organizationService.createOrganization();

    await this.organizationService.addMember(organization._id, user._id);

    await this.environmentService.createDevelopmentEnvironment(organization._id, user._id);

    return user;
  }

  async createUser(userEntity?: Partial<UserEntity>): Promise<UserEntity> {
    const password = userEntity?.password ?? faker.internet.password();
    const passwordHash = await hash(password, 10);

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
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new Error(`Test user with ${id} not found`);
    }

    return user;
  }

  randomEmail(): string {
    return faker.internet.email();
  }

  randomPassword(): string {
    return faker.internet.password();
  }

  testPassword(): string {
    return TEST_USER_PASSWORD;
  }
}
