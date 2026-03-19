import '../../src/config';

import { NestFactory } from '@nestjs/core';
import { PinoLogger } from '@novu/application-generic';
import { TopicSubscribersRepository } from '@novu/dal';
import { AppModule } from '../../src/app.module';

interface DuplicateGroup {
  _id: {
    _environmentId: string;
    identifier: string;
  };
  count: number;
  documentIds: string[];
}

const BATCH_SIZE = 500;

export async function run() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  const logger = await app.resolve(PinoLogger);
  logger.setContext('RemoveDuplicateIdentifiersMigration');
  const topicSubscribersRepository = app.get(TopicSubscribersRepository);

  logger.info('start migration - remove duplicate identifiers in topic subscribers');

  const aggregationPipeline = [
    {
      $match: {
        identifier: { $exists: true },
      },
    },
    {
      $sort: { _id: 1 as const },
    },
    {
      $group: {
        _id: {
          _environmentId: '$_environmentId',
          identifier: '$identifier',
        },
        count: { $sum: 1 },
        documentIds: { $push: '$_id' },
      },
    },
    {
      $match: {
        count: { $gt: 1 },
      },
    },
  ];

  let totalDuplicateGroups = 0;
  let totalDeletedDocuments = 0;
  let deleteOps: { deleteOne: { filter: { _id: string } } }[] = [];

  try {
    const cursor = topicSubscribersRepository._model
      .aggregate<DuplicateGroup>(aggregationPipeline)
      .cursor({ batchSize: 500 });

    for await (const duplicateGroup of cursor) {
      totalDuplicateGroups++;

      const [keptId, ...idsToDelete] = duplicateGroup.documentIds;

      logger.info({
        message: 'Processing duplicate group',
        environmentId: duplicateGroup._id._environmentId.toString(),
        identifier: duplicateGroup._id.identifier,
        keptDocumentId: keptId.toString(),
        deletingDocumentIds: idsToDelete.map((id) => id.toString()),
      });

      for (const idToDelete of idsToDelete) {
        deleteOps.push({
          deleteOne: {
            filter: { _id: idToDelete },
          },
        });
      }

      if (deleteOps.length >= BATCH_SIZE) {
        try {
          const bulkResponse = await topicSubscribersRepository.bulkWrite(deleteOps);
          const deletedCount = bulkResponse.deletedCount || deleteOps.length;
          totalDeletedDocuments += deletedCount;
          logger.info(`Deleted batch of ${deletedCount} duplicate documents`);
          deleteOps = [];
        } catch (error) {
          logger.error(`Error in bulk delete: ${error}`);
          deleteOps = [];
        }
      }
    }

    if (deleteOps.length > 0) {
      try {
        const bulkResponse = await topicSubscribersRepository.bulkWrite(deleteOps);
        const deletedCount = bulkResponse.deletedCount || deleteOps.length;
        totalDeletedDocuments += deletedCount;
        logger.info(`Deleted final batch of ${deletedCount} duplicate documents`);
      } catch (error) {
        logger.error(`Error in final bulk delete: ${error}`);
      }
    }
  } catch (error) {
    logger.error(`Error during migration: ${error}`);
  }

  logger.info(
    `end migration - processed ${totalDuplicateGroups} duplicate groups, deleted ${totalDeletedDocuments} documents`
  );

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
