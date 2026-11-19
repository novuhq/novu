import { createEnv, type EnvVarDefinition, warnDeprecatedEnv } from './env';
import { envSchema } from './env.schema';

const schema = {
  TEST_ENV_STRING: { description: 'Plain string.' },
  TEST_ENV_STRING_DEFAULT: { default: 'fallback', description: 'String with a default.' },
  TEST_ENV_NUMBER: { type: 'number', description: 'Number.' },
  TEST_ENV_NUMBER_DEFAULT: { type: 'number', default: 5, description: 'Number with a default.' },
  TEST_ENV_BOOLEAN: { type: 'boolean', description: 'Boolean.' },
  TEST_ENV_BOOLEAN_ON: { type: 'boolean', default: true, description: 'Boolean that is on by default.' },
  TEST_ENV_DEPRECATED: { deprecated: 'Use TEST_ENV_STRING instead.', description: 'Old name.' },
} satisfies Record<string, EnvVarDefinition>;

const testEnv = createEnv(schema);

describe('env', () => {
  afterEach(() => {
    for (const name of Object.keys(schema)) {
      delete process.env[name];
    }
    vi.restoreAllMocks();
  });

  it('should type each variable from its definition', () => {
    expectTypeOf(testEnv.TEST_ENV_STRING).toEqualTypeOf<string | undefined>();
    expectTypeOf(testEnv.TEST_ENV_STRING_DEFAULT).toEqualTypeOf<string>();
    expectTypeOf(testEnv.TEST_ENV_NUMBER).toEqualTypeOf<number | undefined>();
    expectTypeOf(testEnv.TEST_ENV_NUMBER_DEFAULT).toEqualTypeOf<number>();
    expectTypeOf(testEnv.TEST_ENV_BOOLEAN).toEqualTypeOf<boolean>();
    // @ts-expect-error undeclared variables do not compile
    expect(testEnv.TEST_ENV_UNDECLARED).toBeUndefined();
  });

  it('should return plain strings as-is, including an empty string', () => {
    expect(testEnv.TEST_ENV_STRING).toBeUndefined();

    process.env.TEST_ENV_STRING = '';
    expect(testEnv.TEST_ENV_STRING).toBe('');

    process.env.TEST_ENV_STRING = 'value';
    expect(testEnv.TEST_ENV_STRING).toBe('value');
  });

  it('should read an unset or empty string with a default as the default', () => {
    expect(testEnv.TEST_ENV_STRING_DEFAULT).toBe('fallback');

    process.env.TEST_ENV_STRING_DEFAULT = '';
    expect(testEnv.TEST_ENV_STRING_DEFAULT).toBe('fallback');

    process.env.TEST_ENV_STRING_DEFAULT = 'value';
    expect(testEnv.TEST_ENV_STRING_DEFAULT).toBe('value');
  });

  it('should parse numbers and read unset, empty or invalid values as the default', () => {
    process.env.TEST_ENV_NUMBER = '42';
    expect(testEnv.TEST_ENV_NUMBER).toBe(42);

    for (const raw of ['', 'abc', 'Infinity']) {
      process.env.TEST_ENV_NUMBER = raw;
      process.env.TEST_ENV_NUMBER_DEFAULT = raw;
      expect(testEnv.TEST_ENV_NUMBER).toBeUndefined();
      expect(testEnv.TEST_ENV_NUMBER_DEFAULT).toBe(5);
    }
  });

  it('should read booleans as true only for "true" and false only for "false"', () => {
    expect(testEnv.TEST_ENV_BOOLEAN).toBe(false);
    expect(testEnv.TEST_ENV_BOOLEAN_ON).toBe(true);

    process.env.TEST_ENV_BOOLEAN = 'true';
    process.env.TEST_ENV_BOOLEAN_ON = 'false';
    expect(testEnv.TEST_ENV_BOOLEAN).toBe(true);
    expect(testEnv.TEST_ENV_BOOLEAN_ON).toBe(false);

    process.env.TEST_ENV_BOOLEAN = 'yes';
    process.env.TEST_ENV_BOOLEAN_ON = 'no';
    expect(testEnv.TEST_ENV_BOOLEAN).toBe(false);
    expect(testEnv.TEST_ENV_BOOLEAN_ON).toBe(true);
  });

  it('should log deprecated variables that are still set, without their value', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    warnDeprecatedEnv(schema);
    expect(warn).not.toHaveBeenCalled();

    process.env.TEST_ENV_DEPRECATED = 'secret-value';
    warnDeprecatedEnv(schema);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain('TEST_ENV_DEPRECATED');
    expect(warn.mock.calls[0][0]).toContain('Use TEST_ENV_STRING instead.');
    expect(warn.mock.calls[0][0]).not.toContain('secret-value');
  });

  it('should keep the schema keys sorted so each variable has one obvious place', () => {
    const keys = Object.keys(envSchema);

    expect(keys).toEqual([...keys].sort());
  });
});
