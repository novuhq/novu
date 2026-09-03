import { BadRequestException, Logger } from '@nestjs/common';
import { Exclude, Transform, Type } from 'class-transformer';
import { IsDefined, IsEmail, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

import { BaseCommand, CommandFastPathMismatchError, requiresClassTransformer } from './base.command';

class TestCommand extends BaseCommand {
  @IsDefined()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsDefined()
  password: string;
}

class PlainCommand extends BaseCommand {
  @IsString()
  id: string;

  @IsOptional()
  payload?: Record<string, unknown>;

  @IsOptional()
  tags: string[] = [];
}

class NestedValue {
  @IsString()
  name: string;
}

class TypedCommand extends BaseCommand {
  @ValidateNested()
  @Type(() => NestedValue)
  nested: NestedValue;
}

class TransformedCommand extends BaseCommand {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  key: string;
}

class ExcludedCommand extends BaseCommand {
  @IsString()
  id: string;

  @Exclude()
  session?: { id: string } | null;
}

class InheritsTypedCommand extends TypedCommand {
  @IsOptional()
  extra?: string;
}

const FAST_PATH_ENV_VAR = 'NOVU_COMMAND_FAST_PATH';

describe('BaseCommand', () => {
  const originalMode = process.env[FAST_PATH_ENV_VAR];

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env[FAST_PATH_ENV_VAR];
    } else {
      process.env[FAST_PATH_ENV_VAR] = originalMode;
    }
  });

  describe('requiresClassTransformer', () => {
    it('is false for commands with only class-validator decorators', () => {
      expect(requiresClassTransformer(PlainCommand)).toBe(false);
      expect(requiresClassTransformer(TestCommand)).toBe(false);
    });

    it('is true for @Type, @Transform and @Exclude', () => {
      expect(requiresClassTransformer(TypedCommand)).toBe(true);
      expect(requiresClassTransformer(TransformedCommand)).toBe(true);
      expect(requiresClassTransformer(ExcludedCommand)).toBe(true);
    });

    it('is true when a parent class carries class-transformer metadata', () => {
      expect(requiresClassTransformer(InheritsTypedCommand)).toBe(true);
    });
  });

  describe('fast path mode "off" (default)', () => {
    it('deep-copies nested values', () => {
      delete process.env[FAST_PATH_ENV_VAR];
      const payload = { a: { b: 1 } };

      const command = PlainCommand.create({ id: '1', payload, tags: [] });

      expect(command).toBeInstanceOf(PlainCommand);
      expect(command.payload).toEqual(payload);
      expect(command.payload).not.toBe(payload);
    });
  });

  describe('fast path mode "on"', () => {
    beforeEach(() => {
      process.env[FAST_PATH_ENV_VAR] = 'on';
    });

    it('keeps nested references for undecorated commands and still validates', () => {
      const payload = { a: { b: 1 } };

      const command = PlainCommand.create({ id: '1', payload, tags: ['x'] });

      expect(command).toBeInstanceOf(PlainCommand);
      expect(command.payload).toBe(payload);
      expect(command.tags).toEqual(['x']);
      expect(() => PlainCommand.create({ id: 42 as unknown as string, tags: [] })).toThrow(BadRequestException);
    });

    it('keeps field initializers when the key is absent from data', () => {
      const command = PlainCommand.create({ id: '1' } as PlainCommand);

      expect(command.tags).toEqual([]);
    });

    it('assigns extras after instantiation', () => {
      const session = { id: 's' };

      const command = ExcludedCommand.create({ id: '1' }, { session });

      expect(command.session).toBe(session);
    });

    it('still instantiates @Type nested classes so @ValidateNested validates', () => {
      const command = TypedCommand.create({ nested: { name: 'ok' } });

      expect(command.nested).toBeInstanceOf(NestedValue);
      expect(() => TypedCommand.create({ nested: { name: 1 } as unknown as NestedValue })).toThrow(BadRequestException);
      expect(() => InheritsTypedCommand.create({ nested: { name: 1 } as unknown as NestedValue })).toThrow(
        BadRequestException
      );
    });

    it('still applies @Transform', () => {
      const command = TransformedCommand.create({ key: '  padded  ' });

      expect(command.key).toBe('padded');
    });

    it('still drops @Exclude fields passed in data', () => {
      const command = ExcludedCommand.create({ id: '1', session: { id: 's' } });

      expect(command.session).toBeUndefined();
    });
  });

  describe('fast path mode "shadow"', () => {
    it('returns the legacy result and stays silent when both paths agree', () => {
      process.env[FAST_PATH_ENV_VAR] = 'shadow';
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      const payload = { a: { b: 1 }, when: new Date() };

      const command = PlainCommand.create({ id: '1', payload, tags: [] });

      expect(command.payload).toEqual(payload);
      expect(command.payload).not.toBe(payload);
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('warns with the mismatched keys when the paths differ', () => {
      process.env[FAST_PATH_ENV_VAR] = 'shadow';
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

      const command = PlainCommand.create({ id: '1', payload: { set: new Set([1]) }, tags: [] });

      expect(command).toBeInstanceOf(PlainCommand);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('PlainCommand');
      expect(warn.mock.calls[0][0]).toContain('[payload]');
      warn.mockRestore();
    });

    it('throws in shadow-strict when the paths differ', () => {
      process.env[FAST_PATH_ENV_VAR] = 'shadow-strict';

      expect(() => PlainCommand.create({ id: '1', payload: { set: new Set([1]) }, tags: [] })).toThrow(
        CommandFastPathMismatchError
      );
      expect(() => PlainCommand.create({ id: '1', payload: { a: 1 }, tags: [] })).not.toThrow();
    });
  });

  it('should throw BadRequestException with error messages when field values are not valid', async () => {
    try {
      TestCommand.create({ email: undefined, password: undefined });
      expect(false).toBeTruthy();
    } catch (e) {
      expect((e as BadRequestException).getResponse()).toEqual({
        className: 'TestCommand',
        message:
          'Validation failed for TestCommand: email: email should not be null or undefined, email must be an email, email should not be empty; password: password should not be null or undefined',
        constraintsViolated: {
          email: {
            messages: ['email should not be null or undefined', 'email must be an email', 'email should not be empty'],
            value: undefined,
          },
          password: {
            messages: ['password should not be null or undefined'],
            value: undefined,
          },
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
        message: 'Validation failed for TestCommand: password: password should not be null or undefined',
        constraintsViolated: {
          password: {
            messages: ['password should not be null or undefined'],
            value: undefined,
          },
        },
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
