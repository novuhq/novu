import { IsDefined, IsEmail, IsNotEmpty } from 'class-validator';
import * as sinon from 'sinon';
import * as Sentry from '@sentry/node';
import { BadRequestException } from '@nestjs/common';

import { BaseCommand } from './base.command';

export class TestCommand extends BaseCommand {
  @IsDefined()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsDefined()
  password: string;
}

describe('BaseCommand', function () {
  beforeAll(() => {
    sinon.stub(Sentry, 'addBreadcrumb');
  });

  it('should throw BadRequestException with error messages when field values are not valid', async function () {
    try {
      TestCommand.create({ email: undefined, password: undefined });
      expect(false).toBeTruthy();
    } catch (e) {
      expect((e as BadRequestException).getResponse()).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: [
          'email should not be null or undefined',
          'email must be an email',
          'email should not be empty',
          'password should not be null or undefined',
        ],
      });
    }
  });

  it('should throw BadRequestException with error message when only one field is not valid', async function () {
    try {
      TestCommand.create({ email: 'test@test.com', password: undefined });
      expect(false).toBeTruthy();
    } catch (e) {
      expect((e as BadRequestException).getResponse()).toEqual({
        statusCode: 400,
        error: 'Bad Request',
        message: ['password should not be null or undefined'],
      });
    }
  });

  it('should return object of type that extends the base', async function () {
    const obj = { email: 'test@test.com', password: 'P@ssw0rd' };
    const res = TestCommand.create(obj);

    expect(res instanceof TestCommand).toBeTruthy();
    expect(res).toEqual(obj);
  });
});
