import { Test } from '@nestjs/testing';
import { NotificationTemplateEntity, SubscriberRepository } from '@novu/dal';
import { AddressingTypeEnum, TriggerRecipients, TriggerRequestCategoryEnum } from '@novu/shared';

import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { v4 as uuid } from 'uuid';
import { SharedModule } from '../../../shared/shared.module';
import { EventsModule } from '../../events.module';
import { ParseEventRequestCommand, ParseEventRequestMulticastCommand } from './parse-event-request.command';
import { ParseEventRequest } from './parse-event-request.usecase';

describe('ParseEventRequest Usecase - #novu-v2', () => {
  let session: UserSession;
  let subscribersService: SubscribersService;
  let parseEventRequestUsecase: ParseEventRequest;
  let template: NotificationTemplateEntity;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SharedModule, EventsModule],
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
      [{ subscriberId } as unknown as string],
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

  it('should validate payload against schema when validatePayload is enabled', async () => {
    const transactionId = uuid();
    const subscriber = await subscribersService.createSubscriber();

    // Create a template with payload schema validation enabled
    const templateWithSchema = await session.createTemplate({
      validatePayload: true,
      payloadSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name'],
      },
    });

    const command = buildCommand(
      session,
      transactionId,
      [{ subscriberId: subscriber.subscriberId }],
      templateWithSchema.triggers[0].identifier
    );

    // Test with invalid payload (missing required field)
    command.payload = { age: 25 };

    try {
      await parseEventRequestUsecase.execute(command);
      expect.fail('Should have thrown validation error');
    } catch (error) {
      expect(error.message).to.include('Payload validation failed');
      expect(error.response).to.exist;
      expect(error.response.type).to.equal('PAYLOAD_VALIDATION_ERROR');
      expect(error.response.errors).to.be.an('array');
      expect(error.response.errors).to.have.length.greaterThan(0);
      expect(error.response.errors[0]).to.have.property('field');
      expect(error.response.errors[0]).to.have.property('message');
      expect(error.response.errors[0].field).to.include('name');
    }
  });

  it('should pass validation when payload matches schema', async () => {
    const transactionId = uuid();
    const subscriber = await subscribersService.createSubscriber();

    // Create a template with payload schema validation enabled
    const templateWithSchema = await session.createTemplate({
      validatePayload: true,
      payloadSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' },
        },
        required: ['name'],
      },
    });

    const command = buildCommand(
      session,
      transactionId,
      [{ subscriberId: subscriber.subscriberId }],
      templateWithSchema.triggers[0].identifier
    );

    // Test with valid payload
    command.payload = { name: 'John Doe', age: 25 };

    const result = await parseEventRequestUsecase.execute(command);
    expect(result.acknowledged).to.be.true;
  });

  it('should skip validation when validatePayload is disabled', async () => {
    const transactionId = uuid();
    const subscriber = await subscribersService.createSubscriber();

    // Create a template with payload schema validation disabled
    const templateWithoutValidation = await session.createTemplate({
      validatePayload: false,
      payloadSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      },
    });

    const command = buildCommand(
      session,
      transactionId,
      [{ subscriberId: subscriber.subscriberId }],
      templateWithoutValidation.triggers[0].identifier
    );

    // Test with invalid payload - should not throw error since validation is disabled
    command.payload = { invalidField: 'value' };

    const result = await parseEventRequestUsecase.execute(command);
    expect(result.acknowledged).to.be.true;
  });

  it('should apply default values from schema when validatePayload is enabled', async () => {
    const transactionId = uuid();
    const subscriber = await subscribersService.createSubscriber();

    // Create a template with payload schema validation enabled and default values
    const templateWithDefaults = await session.createTemplate({
      validatePayload: true,
      payloadSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', default: 'Default Name' },
          age: { type: 'number', default: 30 },
          isActive: { type: 'boolean', default: true },
          settings: {
            type: 'object',
            properties: {
              theme: { type: 'string', default: 'dark' },
              notifications: { type: 'boolean', default: false },
            },
            default: {},
          },
        },
        required: [],
      },
    });

    const command = buildCommand(
      session,
      transactionId,
      [{ subscriberId: subscriber.subscriberId }],
      templateWithDefaults.triggers[0].identifier
    );

    // Test with partial payload - defaults should be applied
    command.payload = { name: 'John Doe' };

    const result = await parseEventRequestUsecase.execute(command);
    expect(result.acknowledged).to.be.true;

    // Verify that defaults were applied to the payload
    expect(command.payload.name).to.equal('John Doe'); // Provided value should remain
    expect(command.payload.age).to.equal(30); // Default value should be applied
    expect(command.payload.isActive).to.equal(true); // Default value should be applied
    expect(command.payload.settings).to.deep.equal({ theme: 'dark', notifications: false }); // Nested defaults should be applied
  });

  it('should not override provided values with defaults', async () => {
    const transactionId = uuid();
    const subscriber = await subscribersService.createSubscriber();

    // Create a template with payload schema validation enabled and default values
    const templateWithDefaults = await session.createTemplate({
      validatePayload: true,
      payloadSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', default: 'Default Name' },
          age: { type: 'number', default: 30 },
          isActive: { type: 'boolean', default: true },
        },
        required: [],
      },
    });

    const command = buildCommand(
      session,
      transactionId,
      [{ subscriberId: subscriber.subscriberId }],
      templateWithDefaults.triggers[0].identifier
    );

    // Test with full payload - no defaults should override provided values
    command.payload = { name: 'Jane Doe', age: 25, isActive: false };

    const result = await parseEventRequestUsecase.execute(command);
    expect(result.acknowledged).to.be.true;

    // Verify that provided values were not overridden by defaults
    expect(command.payload.name).to.equal('Jane Doe');
    expect(command.payload.age).to.equal(25);
    expect(command.payload.isActive).to.equal(false);
  });
});

const buildCommand = (
  session: UserSession,
  transactionId: string,
  to: TriggerRecipients,
  identifier: string
): ParseEventRequestCommand => {
  return ParseEventRequestMulticastCommand.create({
    organizationId: session.organization._id,
    environmentId: session.environment._id,
    to,
    transactionId,
    userId: session.user._id,
    identifier,
    payload: {},
    overrides: {},
    addressingType: AddressingTypeEnum.MULTICAST,
    requestCategory: TriggerRequestCategoryEnum.SINGLE,
    requestId: uuid(),
  });
};
