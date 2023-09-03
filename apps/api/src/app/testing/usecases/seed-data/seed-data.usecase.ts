import { Injectable } from '@nestjs/common';
import { faker } from '@faker-js/faker';

import { AuthService } from '@novu/application-generic';

import { SeedDataCommand } from './seed-data.command';
import { UserRegister } from '../../../auth/usecases/register/user-register.usecase';
import { UserRegisterCommand } from '../../../auth/usecases/register/user-register.command';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class SeedData {
  constructor(private authService: AuthService, private userRegister: UserRegister) {}

  async execute(command: SeedDataCommand) {
    const data = {
      email: 'test-user-1@example.com',
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      password: '123qwe!@#',
      organizationName: 'Test Organization',
    };

    const userRegisterCommand = UserRegisterCommand.create(data);

    const { user } = await this.userRegister.execute(userRegisterCommand);
    if (!user) throw new ApiException(`Failed to create user`);

    return {
      password_user: user,
    };
  }
}
