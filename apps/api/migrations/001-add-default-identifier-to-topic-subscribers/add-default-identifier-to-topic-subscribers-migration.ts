import '../../src/config';

import { NestFactory } from '@nestjs/core';
import { buildDefaultSubscriptionIdentifier, PinoLogger } from '@novu/application-generic';
import { TopicSubscribersRepository } from '@novu/dal';
import { AppModule } from '../../src/app.module';

export async function run() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  const logger = await app.resolve(PinoLogger);
  logger.setContext('AddDefaultIdentifierToTopicSubscribersMigration');
  const topicSubscribersRepository = app.get(TopicSubscribersRepository);

  logger.info('start migration - add default identifier to topic subscribers');

  const cursor = await topicSubscribersRepository._model
    .find({
      identifier: { $exists: false },
    })
    .batchSize(1000)
    .cursor();

  let processedCount = 0;
  let updatedCount = 0;
  let bulkWriteOps: any[] = [];
  const BATCH_SIZE = 500;

  for await (const topicSubscriber of cursor) {
    processedCount++;

    if (!topicSubscriber.topicKey || !topicSubscriber.externalSubscriberId) {
      logger.warn(`Skipping topic subscriber ${topicSubscriber._id} - missing topicKey or externalSubscriberId`);
      continue;
    }

    const identifier = buildDefaultSubscriptionIdentifier(
      topicSubscriber.topicKey,
      topicSubscriber.externalSubscriberId
    );

    bulkWriteOps.push({
      updateOne: {
        filter: {
          _id: topicSubscriber._id,
          _environmentId: topicSubscriber._environmentId,
        },
        update: {
          $set: {
            identifier,
          },
        },
      },
    });

    if (bulkWriteOps.length >= BATCH_SIZE) {
      try {
        const bulkResponse = await topicSubscribersRepository.bulkWrite(bulkWriteOps);
        updatedCount += bulkResponse.modifiedCount || bulkWriteOps.length;
        logger.info(
          `Processed ${processedCount} topic subscribers, updated ${updatedCount} (batch: ${bulkResponse.modifiedCount || bulkWriteOps.length})`
        );
        bulkWriteOps = [];
      } catch (error) {
        logger.error(`Error in bulk write: ${error}`);
        bulkWriteOps = [];
      }
    }
  }

  if (bulkWriteOps.length > 0) {
    try {
      const bulkResponse = await topicSubscribersRepository.bulkWrite(bulkWriteOps);
      updatedCount += bulkResponse.modifiedCount || bulkWriteOps.length;
      logger.info(
        `Processed ${processedCount} topic subscribers, updated ${updatedCount} (final batch: ${bulkResponse.modifiedCount || bulkWriteOps.length})`
      );
    } catch (error) {
      logger.error(`Error in final bulk write: ${error}`);
    }
  }

  logger.info(`end migration - processed ${processedCount} topic subscribers, updated ${updatedCount}`);

  await app.close();
}

run()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
