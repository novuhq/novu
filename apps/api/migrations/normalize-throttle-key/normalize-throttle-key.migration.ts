import '../../src/config';

import { NestFactory } from '@nestjs/core';
import { PinoLogger } from '@novu/application-generic';
import { ControlValuesRepository } from '@novu/dal';
import { ControlValuesLevelEnum } from '@novu/shared';

import { AppModule } from '../../src/app.module';

/**
 * Throttle grouping used to accept two shapes for `throttleKey`: a Liquid expression written by the
 * dashboard (`{{payload.orderId}}`) and a bare payload path passed through the API (`orderId`). The
 * worker guessed between them, which mis-grouped events whenever a rendered value collided with a
 * payload property name.
 *
 * The worker now treats the compiled `throttleKey` as the grouping value, matching digest. This
 * rewrites the remaining bare paths into the Liquid form so they keep resolving to the same
 * per-event value instead of collapsing into a single bucket.
 */
export async function run() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
  });

  const logger = await app.resolve(PinoLogger);
  logger.setContext('NormalizeThrottleKeyMigration');

  logger.info('start migration - normalize bare payload paths in throttle keys to liquid');

  const controlValuesRepository = app.get(ControlValuesRepository);

  const stepControls = await controlValuesRepository._model
    .find({
      level: ControlValuesLevelEnum.STEP_CONTROLS,
      'controls.throttleKey': { $type: 'string', $nin: ['', null] },
    })
    .lean();

  logger.info(`Found ${stepControls.length} step controls with a throttle key`);

  let migrated = 0;

  for (const doc of stepControls) {
    const throttleKey = (doc.controls as Record<string, unknown>)?.throttleKey as string;

    if (throttleKey.includes('{{')) {
      continue;
    }

    try {
      await controlValuesRepository._model.updateOne(
        { _id: doc._id },
        { $set: { 'controls.throttleKey': `{{payload.${throttleKey}}}` } }
      );

      migrated += 1;
      logger.info(`Control values ${doc._id} - throttle key '${throttleKey}' normalized to liquid`);
    } catch (error) {
      logger.error(`Failed to normalize throttle key on control values ${doc._id}`, error);
    }
  }

  logger.info(`end migration - normalized ${migrated} throttle keys`);
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
