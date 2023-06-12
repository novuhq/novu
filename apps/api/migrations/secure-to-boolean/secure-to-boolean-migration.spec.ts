import { IntegrationRepository } from '@novu/dal';
import { beforeEach } from 'mocha';
import { updateFalseValues, updateTrueValues } from './secure-to-boolean-migration';
import { expect } from 'chai';

const integrationRepository = new IntegrationRepository();

const STR_FALSE_AMOUNT = 10;
const FALSE_AMOUNT = 12;

const STR_TRUE_AMOUNT = 15;
const TRUE_AMOUNT = 10;

describe('Update integration credentials.secure type from string to boolean', () => {
  beforeEach(async () => {
    await clearIntegrationCollection();
    await seedIntegrationCollection('false', STR_FALSE_AMOUNT);
    await seedIntegrationCollection(false, FALSE_AMOUNT);
    await seedIntegrationCollection('true', STR_TRUE_AMOUNT);
    await seedIntegrationCollection(true, TRUE_AMOUNT);
    // secure is optional so it's good to ensure if migration queries don't affect other integrations
    await seedIntegrationCollection(undefined, 10);
  });

  it('should update credentials.secure from "false" to false', async () => {
    const result = await updateFalseValues();
    expect(result.modifiedCount).to.equal(STR_FALSE_AMOUNT);

    const afterChange = await countAfterChange(false);
    expect(afterChange).to.equal(STR_FALSE_AMOUNT + FALSE_AMOUNT);
  });

  it('should update credentials.secure from "true" to true', async () => {
    const result = await updateTrueValues();
    expect(result.modifiedCount).to.equal(STR_TRUE_AMOUNT);

    const afterChange = await countAfterChange(true);
    expect(afterChange).to.equal(STR_TRUE_AMOUNT + TRUE_AMOUNT);
  });
});

async function clearIntegrationCollection() {
  return integrationRepository._model.collection.deleteMany({});
}

async function seedIntegrationCollection(secureValue: any, amount: number) {
  for (let i = 0; i < amount; i++) {
    await integrationRepository._model.collection.insertOne({
      providerId: 'apns',
      channel: 'push',
      credentials: {
        secure: secureValue,
        apiKey: `nvsk.12345667891011121314151617181920212223`,
        secretKey: `nvsk.12345667891011121314151617181920212223`,
      },
      active: false,
      deleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

async function countAfterChange(secureValue: boolean) {
  return integrationRepository._model.collection.count({ 'credentials.secure': secureValue });
}
