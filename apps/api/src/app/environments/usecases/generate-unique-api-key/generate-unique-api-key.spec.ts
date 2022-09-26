import { EnvironmentRepository } from '@novu/dal';
import { InternalServerErrorException } from '@nestjs/common';
import { expect } from 'chai';
import * as sinon from 'sinon';

import { GenerateUniqueApiKey } from './generate-unique-api-key.usecase';

const environmentRepository = new EnvironmentRepository();
const generateUniqueApiKey = new GenerateUniqueApiKey(environmentRepository);

let generateApiKeyStub;
let findByApiKeyStub;
describe('Generate Unique Api Key', () => {
  beforeEach(() => {
    findByApiKeyStub = sinon.stub(environmentRepository, 'findByApiKey');
    generateApiKeyStub = sinon.stub(generateUniqueApiKey, 'generateApiKey' as any);
  });

  afterEach(() => {
    findByApiKeyStub.restore();
    generateApiKeyStub.restore();
  });

  it('should generate an API key for the environment without any clashing', async () => {
    const expectedApiKey = 'expected-api-key';
    generateApiKeyStub.onFirstCall().returns(expectedApiKey);

    const apiKey = await generateUniqueApiKey.execute();

    expect(typeof apiKey).to.be.string;
    expect(apiKey).to.be.equal(expectedApiKey);
  });

  it('should generate a different valid API key after first one clashes with an existing one', async () => {
    const clashingApiKey = 'clashing-api-key';
    const expectedApiKey = 'expected-api-key';
    generateApiKeyStub.onFirstCall().returns(clashingApiKey);
    generateApiKeyStub.onSecondCall().returns(expectedApiKey);
    findByApiKeyStub.onFirstCall().returns({ key: clashingApiKey });
    findByApiKeyStub.onSecondCall().returns(undefined);

    const apiKey = await generateUniqueApiKey.execute();
    expect(typeof apiKey).to.be.string;
    expect(apiKey).to.be.equal(expectedApiKey);
  });

  it('should throw an error if the generation clashes 3 times', async () => {
    const clashingApiKey = 'clashing-api-key';
    generateApiKeyStub.onFirstCall().returns(clashingApiKey);
    generateApiKeyStub.onSecondCall().returns(clashingApiKey);
    generateApiKeyStub.onThirdCall().returns(clashingApiKey);
    findByApiKeyStub.onFirstCall().returns({ key: clashingApiKey });
    findByApiKeyStub.onSecondCall().returns({ key: clashingApiKey });
    findByApiKeyStub.onThirdCall().returns({ key: clashingApiKey });

    try {
      await generateUniqueApiKey.execute();
      throw new Error('Should not reach here');
    } catch (e) {
      expect(e).to.be.instanceOf(InternalServerErrorException);
      expect(e.message).to.eql('Clashing of the API key generation');
    }
  });
});
