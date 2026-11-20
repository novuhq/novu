import { BadRequestException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsDefined, IsEmail, IsNotEmpty, ValidateNested } from 'class-validator';

import { BaseCommand, CommandValidationException } from './base.command';

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

  describe('skipDeepTransform', () => {
    class NestedChild {
      @IsDefined()
      name: string;
    }

    class DeepCommand extends BaseCommand {
      @IsDefined()
      job: { step: { name: string } };
    }

    class ShallowCommand extends BaseCommand {
      protected static readonly skipDeepTransform = true;

      @IsDefined()
      job: { step: { name: string } };
    }

    class ShallowChildCommand extends ShallowCommand {
      @IsDefined()
      extra: string;
    }

    class ShallowWithTypeCommand extends BaseCommand {
      protected static readonly skipDeepTransform = true;

      @ValidateNested()
      @Type(() => NestedChild)
      child: NestedChild;
    }

    it('deep-copies nested objects by default', () => {
      const job = { step: { name: 'a' } };
      const res = DeepCommand.create({ job });

      expect(res.job).toEqual(job);
      expect(res.job).not.toBe(job);
      expect(res.job.step).not.toBe(job.step);
    });

    it('keeps nested references when opted in', () => {
      const job = { step: { name: 'a' } };
      const res = ShallowCommand.create({ job });

      expect(res).toBeInstanceOf(ShallowCommand);
      expect(res.job).toBe(job);
    });

    it('still validates when opted in', () => {
      expect(() => ShallowCommand.create({ job: undefined as unknown as ShallowCommand['job'] })).toThrow(
        CommandValidationException
      );
    });

    it('is inherited by subclasses', () => {
      const job = { step: { name: 'a' } };
      const res = ShallowChildCommand.create({ job, extra: 'x' });

      expect(res).toBeInstanceOf(ShallowChildCommand);
      expect(res.job).toBe(job);
      expect(() => ShallowChildCommand.create({ job } as ShallowChildCommand)).toThrow(CommandValidationException);
    });

    it('falls back to the deep path when the class uses class-transformer decorators', () => {
      const child = { name: 'a' };
      const res = ShallowWithTypeCommand.create({ child } as ShallowWithTypeCommand);

      expect(res.child).toBeInstanceOf(NestedChild);
      expect(res.child).not.toBe(child);
      expect(() => ShallowWithTypeCommand.create({ child: {} } as ShallowWithTypeCommand)).toThrow(
        CommandValidationException
      );
    });
  });
});
