import { BadRequestException } from '@nestjs/common';
import { IsDefined, IsEmail, IsNotEmpty } from 'class-validator';

import { BaseCommand } from './base.command';

export class TestCommand extends BaseCommand {
  @IsDefined()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsDefined()
  password: string;
}

describe('BaseCommand', () => {
  it('should throw BadRequestException with error messages when field values are not valid', async () => {
    try {
      TestCommand.create({ email: undefined, password: undefined });
      expect(false).toBeTruthy();
    } catch (e) {
      expect((e as BadRequestException).getResponse()).toMatchObject({
        className: 'TestCommand',
        constraintsViolated: {
          email: {
            messages: ['email should not be null or undefined', 'email must be an email', 'email should not be empty'],
          },
          password: { messages: ['password should not be null or undefined'] },
        },
      });
    }
  });

  it('should throw BadRequestException with error message when only one field is not valid', async () => {
    try {
      TestCommand.create({ email: 'test@test.com', password: undefined });
      expect(false).toBeTruthy();
    } catch (e) {
      expect((e as BadRequestException).getResponse()).toEqual({
        className: 'TestCommand',
        constraintsViolated: {
          password: { messages: ['password should not be null or undefined'], value: undefined },
        },
        message: 'Validation failed for TestCommand: password: password should not be null or undefined',
      });
    }
  });

  it('should return object of type that extends the base', async () => {
    const obj = { email: 'test@test.com', password: 'P@ssw0rd' };
    const res = TestCommand.create(obj);

    expect(res instanceof TestCommand).toBeTruthy();
    expect(res).toEqual(obj);
  });
});
