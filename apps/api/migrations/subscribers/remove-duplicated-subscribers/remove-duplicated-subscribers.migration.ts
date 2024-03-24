import '../../../src/config';
import { AppModule } from '../../../src/app.module';

import { NestFactory } from '@nestjs/core';

import { SubscriberRepository } from '@novu/dal';

export async function removeDuplicatedSubscribers() {
  // eslint-disable-next-line no-console
  console.log('start migration - remove duplicated subscribers');

  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  const batchSize = 1000;
  const subscriberRepository = app.get(SubscriberRepository);

  const pipeline = [
    // Group by subscriberId and _environmentId
    {
      $group: {
        _id: { subscriberId: '$subscriberId', environmentId: '$_environmentId' },
        count: { $sum: 1 },
        docs: { $push: '$_id' }, // Store document IDs for removal
      },
    },
    // Filter groups having more than one document (duplicates)
    {
      $match: {
        count: { $gt: 1 },
      },
    },
  ];

  const cursor = await subscriberRepository._model.aggregate(pipeline, {
    batchSize: batchSize,
    readPreference: 'secondaryPreferred',
    allowDiskUse: true,
  });

  for (const group of cursor) {
    const docsToRemove = group.docs.slice(0, -1); // Keep the last created document, remove others
    const { subscriberId, environmentId } = group._id;

    console.log(
      'deleting',
      docsToRemove.length,
      'duplicates for subscriberId:',
      subscriberId,
      'environmentId:',
      environmentId
    );

    try {
      const result = await subscriberRepository.deleteMany({
        _id: { $in: docsToRemove },
        subscriberId: subscriberId,
        _environmentId: environmentId,
      });
      console.log('Documents deleted:', result.modifiedCount);
    } catch (err) {
      console.error('Error deleting documents:', err);
    }
  }

  // eslint-disable-next-line no-console
  console.log('end migration- remove duplicated subscribers');

  app.close();
}
