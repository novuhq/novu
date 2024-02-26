import { MessageRepository, MessageTemplateRepository } from '@novu/dal';

export async function normalizeMessageCtaAction() {
  // eslint-disable-next-line no-console
  console.log('start migration - normalize message cta action');

  const messageRepository = new MessageRepository();
  const messages = await messageRepository._model
    .find({ 'cta.action': '' } as any)
    .read('secondaryPreferred')
    .lean();

  for (const message of messages) {
    // eslint-disable-next-line no-console
    console.log(`message ${message._id}`);

    await messageRepository.update(
      { _id: message._id, _organizationId: message._organizationId, _environmentId: message._environmentId } as any,
      {
        $set: { 'cta.action': {} },
      }
    );
    // eslint-disable-next-line no-console
    console.log(`message ${message._id} - cta action updated`);
  }

  // eslint-disable-next-line no-console
  console.log('end migration');
}
