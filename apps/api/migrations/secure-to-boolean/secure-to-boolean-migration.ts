import '../../src/config';
import { IntegrationRepository } from '@novu/dal';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../src/app.module';

const integrationRepository = new IntegrationRepository();

export async function run() {
  await NestFactory.create(AppModule, {
    logger: false,
  });

  Logger.log('Start migration - update credentials.secure from string to boolean');

  Logger.log('Updating from "true" to true...');
  const resultTrue = await updateTrueValues();
  Logger.log(`Matched: ${resultTrue.matchedCount}  Modified: ${resultTrue.modifiedCount} \n`);

  Logger.log('Updating from "false" to false...');
  const resultFalse = await updateFalseValues();
  Logger.log(`Matched: ${resultFalse.matchedCount}  Modified: ${resultFalse.modifiedCount}`);

  Logger.log('End migration.');
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
