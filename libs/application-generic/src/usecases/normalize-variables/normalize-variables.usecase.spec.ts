import { SubscriberEntity, SubscriberRepository, TenantRepository } from '@novu/dal';
import { FieldLogicalOperatorEnum, FieldOperatorEnum } from '@novu/shared';

import { ConditionsFilterCommand } from '../conditions-filter';
import { NormalizeVariables } from './normalize-variables.usecase';

const findOneSubscriberMock = jest.fn(() => testSubscriber);
const findOneTenantMock = jest.fn(() => null);

jest.mock('@novu/dal', () => ({
  ...jest.requireActual('@novu/dal'),
  SubscriberRepository: jest.fn(() => ({
    findOne: findOneSubscriberMock,
  })),
  TenantRepository: jest.fn(() => ({
    findOne: findOneTenantMock,
  })),
}));

describe('NormalizeVariables', () => {
  let normalizeVariables: NormalizeVariables;

  beforeEach(() => {
    normalizeVariables = new NormalizeVariables(new SubscriberRepository(), new TenantRepository());
    jest.clearAllMocks();
  });

  /*
   * Regression test for https://github.com/novuhq/novu/issues/11602
   *
   * Deferred steps (Digest / Delay / Throttle) evaluate their conditions through
   * NormalizeVariables. Previously the subscriber was only hydrated when a
   * `subscriber`-typed filter was detected, so the subscriber was missing from the
   * evaluation context and conditions referencing subscriber data were skipped.
   */
  it('should hydrate the subscriber even when no subscriber-typed filter is present', async () => {
    const variables = await normalizeVariables.execute(buildCommand({ on: 'payload', field: 'name' }));

    expect(findOneSubscriberMock).toHaveBeenCalledWith({
      _environmentId: command.environmentId,
      subscriberId: command.job.subscriberId,
    });
    expect(variables.subscriber).toEqual(testSubscriber);
  });

  it('should hydrate the subscriber for a subscriber-typed condition', async () => {
    const variables = await normalizeVariables.execute(buildCommand({ on: 'subscriber', field: 'firstName' }));

    expect(findOneSubscriberMock).toHaveBeenCalledTimes(1);
    expect(variables.subscriber).toEqual(testSubscriber);
  });

  it('should reuse the subscriber from command.variables without a repository lookup', async () => {
    const command = buildCommand({ on: 'subscriber', field: 'firstName' });
    command.variables = { subscriber: testSubscriber };

    const variables = await normalizeVariables.execute(command);

    expect(findOneSubscriberMock).not.toHaveBeenCalled();
    expect(variables.subscriber).toEqual(testSubscriber);
  });

  it('should return an undefined subscriber when there is no job to resolve it from', async () => {
    const command = buildCommand({ on: 'subscriber', field: 'firstName' });
    command.job = undefined;

    const variables = await normalizeVariables.execute(command);

    expect(findOneSubscriberMock).not.toHaveBeenCalled();
    expect(variables.subscriber).toBeUndefined();
  });
});

const testSubscriber = {
  _id: '6509997c2c2343366ae4a900',
  subscriberId: 'test-subscriber-id',
  firstName: 'John',
  _environmentId: '6509997c2c2343366ae4a7f1',
  _organizationId: '6509997c2c2343366ae4a7eb',
} as SubscriberEntity;

const command = {
  organizationId: '6509997c2c2343366ae4a7eb',
  environmentId: '6509997c2c2343366ae4a7f1',
  userId: '6509997c2c2343366ae4a7e9',
  job: {
    subscriberId: 'test-subscriber-id',
    _environmentId: '6509997c2c2343366ae4a7f1',
    payload: { name: 'Titans' },
  },
};

function buildCommand({ on, field }: { on: string; field: string }): ConditionsFilterCommand {
  return {
    ...command,
    job: { ...command.job },
    filters: [],
    step: {
      filters: [
        {
          isNegated: false,
          type: 'GROUP',
          value: FieldLogicalOperatorEnum.AND,
          children: [
            {
              field,
              value: 'John',
              operator: FieldOperatorEnum.EQUAL,
              on,
            },
          ],
        },
      ],
    },
  } as unknown as ConditionsFilterCommand;
}
