import { expect } from 'chai';
import { cleanEnv } from 'envalid';

import { envValidators } from './env.validators';

const ACCEPTED = ['true', 'false', 'FALSE', '0', '1', 'no', 'off', 'yes', 'on', '{"servername":"redis.internal"}'];

describe('REDIS_TLS env validator', () => {
  const validators = { REDIS_TLS: envValidators.REDIS_TLS };
  const reporter = ({ errors }: { errors: Record<string, Error> }) => {
    const keys = Object.keys(errors);

    if (keys.length) {
      throw new Error(keys.join(','));
    }
  };

  for (const value of ACCEPTED) {
    it(`accepts ${value}`, () => {
      expect(cleanEnv({ REDIS_TLS: value }, validators, { reporter }).REDIS_TLS).to.equal(value);
    });
  }

  it('accepts an unset value', () => {
    expect(cleanEnv({}, validators, { reporter }).REDIS_TLS).to.equal(undefined);
  });

  it('rejects a typo', () => {
    expect(() => cleanEnv({ REDIS_TLS: 'flase' }, validators, { reporter })).to.throw('REDIS_TLS');
  });
});
