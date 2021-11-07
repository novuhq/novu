import { Injectable } from '@nestjs/common';
import * as faker from 'faker';
import { SeedDataCommand } from './seed-data.command';
import { AuthService } from '../../../auth/services/auth.service';
import { UserRegister } from '../../../auth/usecases/register/user-register.usecase';
import { UserRegisterCommand } from '../../../auth/usecases/register/user-register.command';

@Injectable()
export class SeedData {
  constructor(private authService: AuthService, private userRegister: UserRegister) {}

  async execute(command: SeedDataCommand) {
    const { user } = await this.userRegister.execute(
      UserRegisterCommand.create({
        email: 'test-user-1@example.com',
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        password: '123qwe!@#',
        organizationName: 'Test Organization',
      })
    );

    return {
      password_user: user,
    };
  }
}
