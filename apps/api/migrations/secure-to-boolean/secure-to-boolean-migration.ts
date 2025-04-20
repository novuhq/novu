import '../../src/config';
import { IntegrationRepository } from '@novu/dal';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { getLogger } from '../../src/app/shared/services/logger.service';

const integrationRepository = new IntegrationRepository();

const logger = getLogger('SecureToBooleanMigration');

export async function run() {
  const app = await NestFactory.create(AppModule);

  logger.info('Start migration - update credentials.secure from string to boolean');

  logger.info('Updating from "true" to true...');
  const resultTrue = await updateTrueValues();
  logger.info(`Matched: ${resultTrue.matchedCount}  Modified: ${resultTrue.modifiedCount} \n`);

  logger.info('Updating from "false" to false...');
  const resultFalse = await updateFalseValues();
  logger.info(`Matched: ${resultFalse.matchedCount}  Modified: ${resultFalse.modifiedCount} \n`);

  logger.info('End migration.\n');
  await app.close();
}

type UpdateResult = { matchedCount: number; modifiedCount: number };

export function updateTrueValues() {
  return integrationRepository._model.collection.updateMany(
    {
      'credentials.secure': 'true',
    },
    {
      $set: { 'credentials.secure': true },
    }
  ) as Promise<UpdateResult>;
}

export function updateFalseValues() {
  return integrationRepository._model.collection.updateMany(
    {
      'credentials.secure': 'false',
    },
    {
      $set: { 'credentials.secure': false },
    }
  ) as Promise<UpdateResult>;
}

run();
