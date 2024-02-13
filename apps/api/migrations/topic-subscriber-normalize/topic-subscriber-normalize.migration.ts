import '../../src/config';

import { NestFactory } from '@nestjs/core';
import { SubscriberRepository, TopicSubscribersRepository } from '@novu/dal';

import { AppModule } from '../../src/app.module';

/*
 * topic subscriber normalize - will remove deleted subscribers from topic subscribers
 */
export async function topicSubscriberNormalize() {
  // eslint-disable-next-line no-console
  console.log('start migration - topic subscriber normalize - will remove deleted subscribers from topic subscribers');

  const app = await NestFactory.create(AppModule, {
    logger: false,
  });
  const topicSubscribersRepository = app.get(TopicSubscribersRepository);
  const subscriberRepository = app.get(SubscriberRepository);

  const cursor = await topicSubscribersRepository._model
    .find({} as any)
    .batchSize(1000)
    .cursor();

  for await (const topicSubscriber of cursor) {
    const subscriber = await subscriberRepository.findBySubscriberId(
      topicSubscriber._environmentId.toString(),
      topicSubscriber.externalSubscriberId
    );

    if (!subscriber) {
      // eslint-disable-next-line no-console
      console.log(
        `remove relation topic subscriber ${topicSubscriber.externalSubscriberId} from topic ${topicSubscriber._topicId}`
      );

      await topicSubscribersRepository.delete({
        _environmentId: topicSubscriber._environmentId.toString(),
        _organizationId: topicSubscriber._organizationId,
        externalSubscriberId: topicSubscriber.externalSubscriberId,
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log('end migration- topic subscriber normalize');

  app.close();
}
