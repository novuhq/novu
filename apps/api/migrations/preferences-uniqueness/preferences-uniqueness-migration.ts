import '../../src/config';

import { NestFactory } from '@nestjs/core';
import { PinoLogger } from '@novu/application-generic';
import { PreferencesRepository } from '@novu/dal';
import { PreferencesTypeEnum } from '@novu/shared';
import { Expression } from 'mongoose';
import { AppModule } from '../../src/app.module';

export async function run() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  const logger = await app.resolve(PinoLogger);
  logger.setContext('PreferencesUniquenessMigration');
  const preferencesRepository = app.get(PreferencesRepository);

  logger.info('start migration - preferences uniqueness');

  const promiseTypes = [
    PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
    PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
    PreferencesTypeEnum.USER_WORKFLOW,
    PreferencesTypeEnum.WORKFLOW_RESOURCE,
  ];

  const promises: Promise<void>[] = [];
  // Subscriber global preferences
  promises.push(
    deletePreferenceDuplicates({
      preferencesRepository,
      logger,
      type: PreferencesTypeEnum.SUBSCRIBER_GLOBAL,
      sort: { _environmentId: 1, _subscriberId: 1 },
      groupId: { _environmentId: '$_environmentId', _subscriberId: '$_subscriberId' },
    })
  );

  // Subscriber workflow preferences
  promises.push(
    deletePreferenceDuplicates({
      preferencesRepository,
      logger,
      type: PreferencesTypeEnum.SUBSCRIBER_WORKFLOW,
      sort: { _environmentId: 1, _subscriberId: 1, _templateId: 1 },
      groupId: { _environmentId: '$_environmentId', _subscriberId: '$_subscriberId', _templateId: '$_templateId' },
    })
  );

  // User workflow preferences
  promises.push(
    deletePreferenceDuplicates({
      preferencesRepository,
      logger,
      type: PreferencesTypeEnum.USER_WORKFLOW,
      sort: { _environmentId: 1, _templateId: 1 },
      groupId: { _environmentId: '$_environmentId', _templateId: '$_templateId' },
    })
  );

  // Workflow resource preferences
  promises.push(
    deletePreferenceDuplicates({
      preferencesRepository,
      logger,
      type: PreferencesTypeEnum.WORKFLOW_RESOURCE,
      sort: { _environmentId: 1, _templateId: 1 },
      groupId: { _environmentId: '$_environmentId', _templateId: '$_templateId' },
    })
  );

  await Promise.allSettled(promises).then((results) => {
    for (const result of results) {
      if (result.status === 'rejected') {
        const index = results.indexOf(result);
        const promiseType = promiseTypes[index];

        logger.error('error deleting %s preferences duplicates: %s', promiseType, result.reason);
      }
    }
  });

  logger.info('end migration');
  await app.close();
}

async function deletePreferenceDuplicates({
  preferencesRepository,
  logger,
  type,
  sort,
  groupId,
}: {
  preferencesRepository: PreferencesRepository;
  logger: PinoLogger;
  type: PreferencesTypeEnum;
  sort: Record<string, 1 | Expression.Meta | -1>;
  groupId: Record<string, string>;
}) {
  logger.info('deleting %s preferences duplicates', type);

  const cursor = await preferencesRepository._model.aggregate<{
    ids: { id: string; updatedAt: Date; _environmentId: string }[];
  }>(
    [
      { $match: { type } },
      { $sort: sort },
      {
        $group: {
          _id: groupId,
          ids: { $push: { id: '$_id', updatedAt: '$updatedAt', _environmentId: '$_environmentId' } },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ],
    { maxTimeMS: 600000, allowDiskUse: true }
  );

  logger.info('found %s %s preferences duplicates', cursor.length, type);

  for (const doc of cursor) {
    // sort by updatedAt ascending
    const sorted = doc.ids.sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
    const _idToKeep = sorted.shift(); // keep the oldest
    const toDelete = sorted.map((d) => d.id);

    await preferencesRepository.delete({
      _id: { $in: toDelete },
      _environmentId: doc.ids[0]._environmentId,
    });
  }

  logger.info('deleted %s %s preferences duplicates', cursor.length, type);
}

/* run()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); */
