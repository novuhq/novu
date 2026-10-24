import { expect } from 'chai';
import { getDefaultProjectConfig } from './default-project.config';

const baseEnvironment = {
  NOVU_DEFAULT_PROJECT_NAME: 'Acme',
  NOVU_DEFAULT_PROJECT_ID: '507f1f77bcf86cd799439011',
  NOVU_DEFAULT_API_KEY: 'acme-api-key',
};

describe('Default project configuration', () => {
  it('returns undefined when the feature is disabled', () => {
    expect(getDefaultProjectConfig({})).to.equal(undefined);
  });

  it('returns the configured project without exposing or changing the key', () => {
    expect(getDefaultProjectConfig(baseEnvironment)).to.deep.equal({
      name: 'Acme',
      id: '507f1f77bcf86cd799439011',
      apiKey: 'acme-api-key',
    });
  });

  it('rejects partial configuration', () => {
    expect(() => getDefaultProjectConfig({ NOVU_DEFAULT_PROJECT_NAME: 'Acme' })).to.throw('must be set together');
  });

  it('rejects an invalid project ID', () => {
    expect(() => getDefaultProjectConfig({ ...baseEnvironment, NOVU_DEFAULT_PROJECT_ID: 'not-an-object-id' })).to.throw(
      '24-character MongoDB ObjectId'
    );
  });
});
