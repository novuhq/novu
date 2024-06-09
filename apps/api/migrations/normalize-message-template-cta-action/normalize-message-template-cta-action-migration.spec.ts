import { expect } from 'chai';
import { faker } from '@faker-js/faker';

import { UserSession } from '@novu/testing';
import { MessageRepository, MessageTemplateRepository } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';

import { normalizeMessageTemplateCtaAction } from './normalize-message-template-cta-action-migration';
import { normalizeMessageCtaAction } from './normalize-message-cta-action-migration';

describe('Normalize cta action', function () {
  let session: UserSession;
  const messageTemplateRepository = new MessageTemplateRepository();
  const messageRepository = new MessageRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
  });

  it('normalize message template cta action', async function () {
    await messageTemplateRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      _creatorId: session.user._id,
      type: StepTypeEnum.IN_APP,
      content: 'noise',
      cta: {
        action: {
          buttons: [
            {
              title: faker.lorem.words(3),
              url: faker.internet.url(),
            },
          ],
        },
      },
    });

    await messageTemplateRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      _creatorId: session.user._id,
      type: StepTypeEnum.IN_APP,
      content: 'invalid action state',
      cta: {
        action: '',
      },
    });

    const messages = await messageTemplateRepository.find({ 'cta.action': '' } as any);

    expect(messages.length).to.equal(1);
    expect(messages[0]?.cta?.action).to.equal('');
    expect(messages[0]?.content).to.equal('invalid action state');

    await normalizeMessageTemplateCtaAction();

    const normalizedMessages = await messageTemplateRepository.find({ 'cta.action': '' } as any);

    expect(normalizedMessages.length).to.equal(0);
  });

  it('normalize message cta action', async function () {
    await messageRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      content: 'noise',
      cta: {
        action: {
          buttons: [
            {
              title: faker.lorem.words(3),
              url: faker.internet.url(),
            },
          ],
        },
      },
    });

    const createdMessage = await messageRepository.create({
      _organizationId: session.organization._id,
      _environmentId: session.environment._id,
      content: 'invalid action state',
      cta: {
        action: '',
      },
    });
    await messageRepository.update(
      {
        _id: createdMessage._id,
        _organizationId: createdMessage._organizationId,
        _environmentId: createdMessage._environmentId,
      } as any,
      {
        $set: { 'cta.action': '' },
      }
    );

    const messages = await messageRepository.find({ 'cta.action': '' } as any);

    expect(messages.length).to.equal(1);
    expect(messages[0]?.cta?.action).to.equal('');
    expect(messages[0]?.content).to.equal('invalid action state');

    await normalizeMessageCtaAction();

    const normalizedMessages = await messageRepository.find({ 'cta.action': '' } as any);

    expect(normalizedMessages.length).to.equal(0);
  });
});
