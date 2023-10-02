import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { v4 as uuid } from 'uuid';

import { SubscribersService, UserSession } from '@novu/testing';
import { SubscriberRepository, NotificationTemplateEntity } from '@novu/dal';
import { TriggerRecipients } from '@novu/shared';

import { SharedModule } from '../../../shared/shared.module';
import { EventsModule } from '../../events.module';
import { ParseEventRequestCommand } from './parse-event-request.command';
import { ParseEventRequest } from './parse-event-request.usecase';

describe('ParseEventRequest Usecase', () => {
  let session: UserSession;
  let subscribersService: SubscribersService;
  let parseEventRequestUsecase: ParseEventRequest;
  let template: NotificationTemplateEntity;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule, EventsModule],
      providers: [],
    }).compile();

    session = new UserSession();
    await session.initialize();

    template = await session.createTemplate();
    parseEventRequestUsecase = moduleRef.get<ParseEventRequest>(ParseEventRequest);
    subscribersService = new SubscribersService(session.organization._id, session.environment._id);
  });

  it('should throw exception when subscriber id sent as array', async () => {
    const transactionId = uuid();
    const subscriberId = [SubscriberRepository.createObjectId()];

    const command = buildCommand(
      session,
      transactionId,
      [{ subscriberId: subscriberId } as unknown as string],
      template.triggers[0].identifier
    );

    try {
      await parseEventRequestUsecase.execute(command);
    } catch (error) {
      expect(error.message).to.be.eql(
        'subscriberId under property to is type array, which is not allowed please make sure all subscribers ids are strings'
      );
    }
  });
});

const buildCommand = (
  session: UserSession,
  transactionId: string,
  to: TriggerRecipients,
  identifier: string
): ParseEventRequestCommand => {
  return ParseEventRequestCommand.create({
    organizationId: session.organization._id,
    environmentId: session.environment._id,
    to,
    transactionId,
    userId: session.user._id,
    identifier,
    payload: {},
    overrides: {},
  });
};
