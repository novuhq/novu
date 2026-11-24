import { FeatureFlagsKeysEnum, JobTopicNameEnum, QueueBackend } from '@novu/shared';
import type { EnvVarDefinition } from './env';
import { envSchema } from './env.schema';
import { validateEnvSchema } from './env-validation';

const schema = {
  TEST_BOOT_REQUIRED: { boot: { api: 'required' }, description: 'Required by the api.' },
  TEST_BOOT_NUMBER: { type: 'number', boot: { api: 'checked' }, description: 'Number the api checks.' },
  TEST_BOOT_WORKER_ONLY: { type: 'number', boot: { worker: 'checked' }, description: 'Only the worker checks it.' },
  TEST_BOOT_URL: { format: 'url', boot: { api: 'checked' }, description: 'URL.' },
  TEST_BOOT_CHOICE: {
    choices: ['a', 'b'],
    boot: { api: 'checked', worker: { choices: ['a', 'b', 'c'] } },
    description: 'One of a or b, or c in the worker.',
  },
  TEST_BOOT_ON_AWS: { boot: { api: { required: 'storage-aws' } }, description: 'Required with S3 storage.' },
  TEST_BOOT_PORT_ON_AWS: {
    format: 'port',
    boot: { api: { when: 'storage-aws', required: true } },
    description: 'Required port with S3 storage, ignored otherwise.',
  },
  TEST_BOOT_KEY: { boot: { api: { required: true, length: 4 } }, description: 'Four characters.' },
  TEST_BOOT_READ_BY: {
    readBy: ['@novu/test-dependency'],
    format: 'boolean',
    boot: { api: 'checked' },
    description: 'Checked although only a dependency reads it.',
  },
} satisfies Record<string, EnvVarDefinition>;

const VALID = { TEST_BOOT_REQUIRED: 'set', TEST_BOOT_KEY: 'abcd' };
const FLAG = FeatureFlagsKeysEnum.IS_API_RATE_LIMITING_ENABLED;
const TOUCHED = [...Object.keys(schema), 'STORAGE_SERVICE', 'QUEUE_BACKEND', 'SQS_QUEUE_URL_WEB_SOCKETS', FLAG];

/** Sets only the valid baseline plus `values` (undefined unsets), then validates as `service`. */
function validate(
  values: Record<string, string | undefined>,
  service: 'api' | 'worker' = 'api',
  checkFeatureFlags = false
) {
  for (const name of TOUCHED) {
    delete process.env[name];
  }

  for (const [name, value] of Object.entries({ ...VALID, ...values })) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }

  validateEnvSchema(service, schema, { checkFeatureFlags, queueBackend: { topics: [JobTopicNameEnum.WEB_SOCKETS] } });
}

describe('validateEnvSchema', () => {
  const original = Object.fromEntries(TOUCHED.map((name) => [name, process.env[name]]));

  beforeEach(() => {
    for (const name of TOUCHED) {
      delete process.env[name];
    }
  });

  afterAll(() => {
    for (const [name, value] of Object.entries(original)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  });

  it('should pass when every required variable is set and every checked one is valid', () => {
    expect(() => validate({ TEST_BOOT_NUMBER: '3', TEST_BOOT_URL: 'https://novu.co' })).not.toThrow();
  });

  it('should name every missing or invalid variable, never the value', () => {
    const run = () => validate({ TEST_BOOT_REQUIRED: undefined, TEST_BOOT_NUMBER: 'secret-value' });

    expect(run).toThrow(
      'Invalid api environment:\n  TEST_BOOT_REQUIRED: missing (required)\n  TEST_BOOT_NUMBER: invalid value'
    );
    expect(run).toThrow(expect.objectContaining({ message: expect.not.stringContaining('secret-value') }));
  });

  it('should check values with envalid, which rejects empty typed values', () => {
    expect(() => validate({ TEST_BOOT_NUMBER: '' })).toThrow('TEST_BOOT_NUMBER: invalid value');
    expect(() => validate({ TEST_BOOT_URL: 'not a url' })).toThrow('TEST_BOOT_URL: invalid value');
    expect(() => validate({ TEST_BOOT_READ_BY: 'yes' })).not.toThrow();
    expect(() => validate({ TEST_BOOT_READ_BY: 'maybe' })).toThrow('TEST_BOOT_READ_BY: invalid value');
  });

  it("should apply only the service's own rules", () => {
    expect(() => validate({ TEST_BOOT_WORKER_ONLY: 'abc' })).not.toThrow();
    expect(() => validate({ TEST_BOOT_WORKER_ONLY: 'abc' }, 'worker')).toThrow('TEST_BOOT_WORKER_ONLY: invalid value');
    expect(() => validate({ TEST_BOOT_CHOICE: 'c' })).toThrow('TEST_BOOT_CHOICE: invalid value');
    expect(() => validate({ TEST_BOOT_CHOICE: 'c' }, 'worker')).not.toThrow();
  });

  it('should require or check a variable only while its condition applies', () => {
    expect(() => validate({ TEST_BOOT_PORT_ON_AWS: 'abc' })).not.toThrow();
    expect(() => validate({ STORAGE_SERVICE: 'aws' })).toThrow(
      'Invalid api environment:\n  TEST_BOOT_ON_AWS: missing (required)\n  TEST_BOOT_PORT_ON_AWS: missing (required)'
    );
    expect(() =>
      validate({ STORAGE_SERVICE: 'AWS', TEST_BOOT_ON_AWS: 'x', TEST_BOOT_PORT_ON_AWS: '6379' })
    ).not.toThrow();
  });

  it('should check an exact length', () => {
    expect(() => validate({ TEST_BOOT_KEY: 'abc' })).toThrow('TEST_BOOT_KEY: invalid value');
  });

  it('should check the feature flag family only when asked', () => {
    expect(() => validate({ [FLAG]: 'maybe' })).not.toThrow();
    expect(() => validate({ [FLAG]: 'maybe' }, 'api', true)).toThrow(`${FLAG}: invalid value`);
    expect(() => validate({ [FLAG]: '1' }, 'api', true)).not.toThrow();
  });

  it('should check the queue backend settings for the given topics', () => {
    expect(() => validate({ QUEUE_BACKEND: QueueBackend.SQS })).toThrow(
      'SQS_QUEUE_URL_WEB_SOCKETS is required when QUEUE_BACKEND=sqs'
    );
  });

  describe('REDIS_TLS', () => {
    const redisTls = { REDIS_TLS: envSchema.REDIS_TLS } satisfies Record<string, EnvVarDefinition>;
    const accepted = ['true', 'false', 'FALSE', '0', '1', 'no', 'off', 'yes', 'on', '{"servername":"redis.internal"}'];
    const validateTls = (value: string) => {
      process.env.REDIS_TLS = value;

      try {
        validateEnvSchema('ws', redisTls, { queueBackend: { topics: [] } });
      } finally {
        delete process.env.REDIS_TLS;
      }
    };

    for (const value of accepted) {
      it(`should accept ${value}`, () => {
        expect(() => validateTls(value)).not.toThrow();
      });
    }

    it('should reject a typo', () => {
      expect(() => validateTls('flase')).toThrow('REDIS_TLS: invalid value');
    });
  });
});
