import { expect } from 'chai';
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
  before(() => {
    sinon.stub(Sentry, 'addBreadcrumb');
  });

  it('should throw BadRequestException with error messages when field values are not valid', async function () {
    expect(() => TestCommand.create({ email: undefined, password: undefined }))
      .to.throw(BadRequestException)
      .deep.include({
        response: {
          statusCode: 400,
          error: 'Bad Request',
          message: [
            'email should not be null or undefined',
            'email must be an email',
            'email should not be empty',
            'password should not be null or undefined',
          ],
        },
      });
  });

  it('should throw BadRequestException with error message when only one field is not valid', async function () {
    expect(() => TestCommand.create({ email: 'test@test.com', password: undefined }))
      .to.throw(BadRequestException)
      .deep.include({
        response: {
          statusCode: 400,
          error: 'Bad Request',
          message: ['password should not be null or undefined'],
        },
      });
  });

  it('should return object of type that extends the base', async function () {
    const obj = { email: 'test@test.com', password: 'P@ssw0rd' };
    const res = TestCommand.create(obj);

    expect(res instanceof TestCommand).to.be.true;
    expect(res).to.deep.equal(obj);
  });
});
