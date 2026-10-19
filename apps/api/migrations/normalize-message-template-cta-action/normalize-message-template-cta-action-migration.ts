import { MessageTemplateRepository } from '@novu/dal';

export async function normalizeMessageTemplateCtaAction() {
  console.log('start migration - normalize message template cta action');

  const messageTemplateRepository = new MessageTemplateRepository();
  const messageTemplates = await messageTemplateRepository._model
    .find({ 'cta.action': '' } as any)
    .read('secondaryPreferred');

  for (const message of messageTemplates) {
    console.log(`message ${message._id}`);

    await messageTemplateRepository.update(
      { _id: message._id, _organizationId: message._organizationId, _environmentId: message._environmentId } as any,
      {
        $set: { 'cta.action': {} },
      }
    );
    console.log(`message ${message._id} - cta action updated`);
  }

  console.log('end migration');
}
