import '../../src/config';
import { IntegrationRepository } from '@novu/dal';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../src/app.module';

const integrationRepository = new IntegrationRepository();
const MIGRATION_CONTEXT = 'Migration';

export async function run() {
  const app = await NestFactory.create(AppModule);

  Logger.log('Start migration - update credentials.secure from string to boolean', MIGRATION_CONTEXT);

  Logger.log('Updating from "true" to true...', MIGRATION_CONTEXT);
  const resultTrue = await updateTrueValues();
  Logger.log(`Matched: ${resultTrue.matchedCount}  Modified: ${resultTrue.modifiedCount} \n`, MIGRATION_CONTEXT);

  Logger.log('Updating from "false" to false...', MIGRATION_CONTEXT);
  const resultFalse = await updateFalseValues();
  Logger.log(`Matched: ${resultFalse.matchedCount}  Modified: ${resultFalse.modifiedCount} \n`, MIGRATION_CONTEXT);

  Logger.log('End migration.\n', MIGRATION_CONTEXT);
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
