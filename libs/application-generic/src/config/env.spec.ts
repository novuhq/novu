import { createAppEnv } from './app-env';
import { createEnv, type EnvVarDefinition } from './env';
import { envSchema } from './env.schema';

const schema = {
  TEST_ENV_STRING: { description: 'Plain string.' },
  TEST_ENV_STRING_DEFAULT: { default: 'fallback', description: 'String with a default.' },
  TEST_ENV_NUMBER: { type: 'number', description: 'Number.' },
  TEST_ENV_NUMBER_DEFAULT: { type: 'number', default: 5, description: 'Number with a default.' },
  TEST_ENV_BOOLEAN: { type: 'boolean', description: 'Boolean.' },
  TEST_ENV_BOOLEAN_ON: { type: 'boolean', default: true, description: 'Boolean that is on by default.' },
  TEST_ENV_DEPRECATED: { type: 'boolean', deprecated: 'Use TEST_ENV_RENAMED instead.', description: 'Old name.' },
  TEST_ENV_RENAMED: { type: 'boolean', replaces: 'TEST_ENV_DEPRECATED', description: 'New name.' },
  TEST_ENV_READ_BY: { readBy: ['@novu/test-dependency'], description: 'Read by a dependency.' },
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

  it('should leave variables only dependencies read out of env', () => {
    process.env.TEST_ENV_READ_BY = 'value';

    // @ts-expect-error a variable only dependencies read has no env.X
    expect(testEnv.TEST_ENV_READ_BY).toBeUndefined();
    expect(Object.keys(testEnv)).not.toContain('TEST_ENV_READ_BY');

    const withDefault = { readBy: ['@novu/test-dependency'], default: 'x', description: 'Read by a dependency.' };
    // @ts-expect-error a variable only dependencies read has no type or default
    createEnv({ TEST_ENV_READ_BY: withDefault });
  });

  it('should leave deprecated variables out of env, so new code cannot read them', () => {
    process.env.TEST_ENV_DEPRECATED = 'true';

    // @ts-expect-error a deprecated variable has no env.X
    expect(testEnv.TEST_ENV_DEPRECATED).toBeUndefined();
    expect(Object.keys(testEnv)).not.toContain('TEST_ENV_DEPRECATED');
  });

  it('should read the replaced name while the new one is unset or empty', () => {
    process.env.TEST_ENV_DEPRECATED = 'true';
    expect(testEnv.TEST_ENV_RENAMED).toBe(true);

    process.env.TEST_ENV_RENAMED = '';
    expect(testEnv.TEST_ENV_RENAMED).toBe(true);

    process.env.TEST_ENV_RENAMED = 'false';
    expect(testEnv.TEST_ENV_RENAMED).toBe(false);
  });

  it('should build an app env from the shared schema plus the app variables', () => {
    const appEnv = createAppEnv(
      { TEST_ENV_APP_FLAG: { type: 'boolean', default: true, description: 'App-only boolean.' } },
      { service: 'api' }
    ).env;

    expectTypeOf(appEnv.TEST_ENV_APP_FLAG).toEqualTypeOf<boolean>();
    expectTypeOf(appEnv.NODE_ENV).toEqualTypeOf<string | undefined>();
    expect(appEnv.TEST_ENV_APP_FLAG).toBe(true);
    expect(appEnv.NODE_ENV).toBe(process.env.NODE_ENV);

    // @ts-expect-error an app cannot redeclare a shared variable
    createAppEnv({ NODE_ENV: { description: 'Shadows the shared NODE_ENV.' } }, { service: 'api' });
  });

  it('should log deprecated variables that are still set, without their value', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { warnDeprecatedEnv } = createAppEnv(schema, { service: 'api' });
    const warnings = () => warn.mock.calls.map(([message]) => String(message)).filter((m) => m.includes('TEST_ENV_'));

    warnDeprecatedEnv();
    expect(warnings()).toEqual([]);

    process.env.TEST_ENV_DEPRECATED = 'secret-value';
    warnDeprecatedEnv();
    expect(warnings()).toEqual([
      '[Env] TEST_ENV_DEPRECATED is deprecated and still set. Use TEST_ENV_RENAMED instead.',
    ]);
  });

  it('should keep the schema keys sorted so each variable has one obvious place', () => {
    const keys = Object.keys(envSchema);

    expect(keys).toEqual([...keys].sort());
  });

  it('should only replace shared variables that are declared and deprecated', () => {
    const definitions: Record<string, EnvVarDefinition> = envSchema;
    const replaced = Object.values(definitions).flatMap((definition) =>
      definition.replaces ? [definition.replaces] : []
    );

    expect(replaced.length).toBeGreaterThan(0);
    for (const name of replaced) {
      expect(definitions[name]?.deprecated, name).toBeTruthy();
    }
  });
});
