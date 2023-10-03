import '../../src/config';

import { NestFactory } from '@nestjs/core';
import { PreferenceLevelEnum, SubscriberPreferenceRepository } from '@novu/dal';

import { AppModule } from '../../src/app.module';

export async function addLevelPropertyToSubscriberPreferences() {
  // eslint-disable-next-line no-console
  console.log('start migration - add level property to subscriber preferences');
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  const subscriberPreferenceRepository = app.get(SubscriberPreferenceRepository);
  // eslint-disable-next-line no-console
  console.log('add level: PreferenceLevelEnum.TEMPLATE to all subscriber preferences without level property');

  await subscriberPreferenceRepository._model.collection.updateMany(
    { level: { $exists: false }, _templateId: { $exists: true } },
    {
      $set: { level: PreferenceLevelEnum.TEMPLATE },
    }
  );

  // eslint-disable-next-line no-console
  console.log('end migration- add level property to subscriber preferences');

  app.close();
  process.exit(0);
}

addLevelPropertyToSubscriberPreferences();
