import '../../../src/config';
import { NestFactory } from '@nestjs/core';
import { SubscriberRepository } from '@novu/dal';
import { AppModule } from '../../../src/app.module';
import { IChannelSettings, ISubscriber } from '@novu/shared';

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
        subscribers: { $push: '$$ROOT' }, // Store all documents of each group
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
    const { subscriberId, environmentId } = group._id;
    const subscribers = group.subscribers;

    if (subscribers.length <= 1) {
      continue;
    }

    // sort oldest subscriber first
    const sortedSubscribers = subscribers.sort((a, b) => a.updatedAt - b.updatedAt);
    const mergedSubscriber = mergeSubscribers(sortedSubscribers);
    const subscribersToRemove = sortedSubscribers.filter((subscriber) => subscriber._id !== mergedSubscriber._id);

    // eslint-disable-next-line no-console
    console.log(
      'Merged subscriber:',
      mergedSubscriber._id.toString(),
      'subscriberId:',
      subscriberId,
      'environmentId:',
      environmentId.toString()
    );

    try {
      await subscriberRepository.update(
        {
          _id: mergedSubscriber._id,
          subscriberId: subscriberId,
          _environmentId: environmentId,
        },
        {
          $set: mergedSubscriber,
        }
      );

      // eslint-disable-next-line no-console
      console.log(
        'Remaining subscriber updated with merged data for subscriberId:',
        subscriberId,
        'subscriberId:',
        mergedSubscriber._id.toString(),
        'environmentId:',
        environmentId.toString()
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error updating remaining subscribers:', err);
    }

    try {
      // Delete all duplicates except the merged one
      await subscriberRepository.deleteMany({
        _id: { $in: subscribersToRemove.map((subscriber) => subscriber._id) },
        subscriberId: subscriberId,
        _environmentId: environmentId,
      });
      // eslint-disable-next-line no-console
      console.log(
        'Duplicates deleted for subscriberId:',
        subscriberId,
        'environmentId:',
        environmentId.toString(),
        'ids:',
        subscribersToRemove.map((subscriber) => subscriber._id).join()
      );
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error deleting duplicates:', err);
    }
  }

  // eslint-disable-next-line no-console
  console.log('end migration - remove duplicated subscribers');

  app.close();
}

// Function to merge subscriber information
function mergeSubscribers(subscribers) {
  const mergedSubscriber = { ...subscribers[0] }; // Start with the first subscriber

  // Initialize a map to store merged channels
  const mergedChannelsMap = new Map();

  // Merge information from other subscribers
  for (const subscriber of subscribers) {
    const currentSubscriber = subscriber;
    for (const key in currentSubscriber) {
      // Skip internal and irrelevant fields
      if (
        [
          '_id',
          '_organizationId',
          '_environmentId',
          'deleted',
          'createdAt',
          'updatedAt',
          '__v',
          'isOnline',
          'lastOnlineAt',
        ].includes(key)
      ) {
        continue;
      }

      // Update with non-null/undefined values from subsequent subscribers
      if (currentSubscriber[key] !== null && currentSubscriber[key] !== undefined) {
        if (key === 'channels') {
          mergeSubscriberChannels(currentSubscriber, mergedChannelsMap);
        } else {
          // For other keys, update directly
          mergedSubscriber[key] = currentSubscriber[key];
        }
      }
    }
  }

  // Convert merged channels map back to array
  mergedSubscriber.channels = [...mergedChannelsMap.values()];

  return mergedSubscriber;
}

function mergeChannels(existingChannel: IChannelSettings, newChannel: IChannelSettings) {
  const result = { ...existingChannel };

  // Merge deviceTokens
  const allTokens = [
    ...(existingChannel?.credentials?.deviceTokens || []),
    ...(newChannel?.credentials?.deviceTokens || []),
  ];
  result.credentials.deviceTokens = [...new Set(allTokens)];

  if (newChannel.credentials.webhookUrl) {
    existingChannel.credentials.webhookUrl = newChannel.credentials.webhookUrl;
  }

  return existingChannel;
}

function mergeSubscriberChannels(subscriber: ISubscriber, mergedChannelsMap) {
  for (const channel of subscriber.channels || []) {
    const integrationId = channel._integrationId;
    if (!mergedChannelsMap.has(integrationId)) {
      // merging the same channel as a workaround just to make sure we always remove token duplications
      mergedChannelsMap.set(integrationId, mergeChannels(channel, channel));
    } else {
      // If the integration ID exists, merge device tokens
      const existingChannel = mergedChannelsMap.get(integrationId);
      mergedChannelsMap.set(integrationId, mergeChannels(existingChannel, channel));
    }
  }
}
