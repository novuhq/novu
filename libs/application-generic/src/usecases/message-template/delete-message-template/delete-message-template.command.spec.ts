import { ChangeEntityTypeEnum, ResourceTypeEnum } from '@novu/shared';
import { CreateChangeCommand } from '../../create-change/create-change.command';
import { DeleteMessageTemplateCommand } from './delete-message-template.command';

/**
 * Regression for NV-8457: passing a ClientSession-like instance through
 * `BaseCommand.create` / `plainToInstance` calls `new ClientSession()` and throws
 * `MongoRuntimeError: ClientSession requires a MongoClient`. Pass session as the
 * second `extras` argument instead.
 */
describe('Mongo ClientSession on BaseCommand.create', () => {
  class ThrowsWithoutClient {
    constructor(client?: unknown) {
      if (!client) {
        throw new Error('ClientSession requires a MongoClient');
      }
    }
  }

  const fakeSession = Object.assign(Object.create(ThrowsWithoutClient.prototype), {
    id: 'fake-client-session',
  }) as any;

  it('DeleteMessageTemplateCommand.create throws if session is passed through plainToInstance', () => {
    expect(() =>
      DeleteMessageTemplateCommand.create({
        organizationId: 'aaaaaaaaaaaaaaaaaaaaaaa1',
        environmentId: 'aaaaaaaaaaaaaaaaaaaaaaa2',
        userId: 'aaaaaaaaaaaaaaaaaaaaaaa3',
        messageTemplateId: 'aaaaaaaaaaaaaaaaaaaaaaa4',
        workflowType: ResourceTypeEnum.REGULAR,
        session: fakeSession,
      })
    ).toThrow('ClientSession requires a MongoClient');
  });

  it('DeleteMessageTemplateCommand preserves session via create extras', () => {
    const command = DeleteMessageTemplateCommand.create(
      {
        organizationId: 'aaaaaaaaaaaaaaaaaaaaaaa1',
        environmentId: 'aaaaaaaaaaaaaaaaaaaaaaa2',
        userId: 'aaaaaaaaaaaaaaaaaaaaaaa3',
        messageTemplateId: 'aaaaaaaaaaaaaaaaaaaaaaa4',
        workflowType: ResourceTypeEnum.REGULAR,
      },
      { session: fakeSession }
    );

    expect(command.session).toBe(fakeSession);
  });

  it('CreateChangeCommand preserves session via create extras', () => {
    const command = CreateChangeCommand.create(
      {
        organizationId: 'aaaaaaaaaaaaaaaaaaaaaaa1',
        environmentId: 'aaaaaaaaaaaaaaaaaaaaaaa2',
        userId: 'aaaaaaaaaaaaaaaaaaaaaaa3',
        changeId: 'aaaaaaaaaaaaaaaaaaaaaaa4',
        type: ChangeEntityTypeEnum.MESSAGE_TEMPLATE,
        item: { _id: 'aaaaaaaaaaaaaaaaaaaaaaa5' },
      },
      { session: fakeSession }
    );

    expect(command.session).toBe(fakeSession);
  });
});
