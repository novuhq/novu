import { MessageTemplateRepository } from '@novu/dal';

export async function normalizeMessageTemplateCtaAction() {
  // eslint-disable-next-line no-console
  console.log('start migration - normalize message template cta action');

  const messageTemplateRepository = new MessageTemplateRepository();
  const messageTemplates = await messageTemplateRepository._model
    .find({ 'cta.action': '' } as any)
    .read('secondaryPreferred');

  for (const message of messageTemplates) {
    // eslint-disable-next-line no-console
    console.log(`message ${message._id}`);

    await messageTemplateRepository.update(
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
