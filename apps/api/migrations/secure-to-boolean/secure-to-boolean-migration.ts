/* eslint-disable no-console */
import '../../src/config';
import { IntegrationRepository } from '@novu/dal';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';

const integrationRepository = new IntegrationRepository();

export async function run() {
  await NestFactory.create(AppModule, {
    logger: false,
  });

  console.log('Start migration - update credentials.secure from string to boolean');

  console.log('Updating from "true" to true...');
  const resultTrue = await updateTrueValues();
  console.log(`Matched: ${resultTrue.matchedCount}\nModified: ${resultTrue.modifiedCount} \n`);

  console.log('Updating from "false" to false...');
  const resultFalse = await updateFalseValues();
  console.log(`Matched: ${resultFalse.matchedCount}\nModified: ${resultFalse.modifiedCount}`);

  console.log('End migration.');
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
