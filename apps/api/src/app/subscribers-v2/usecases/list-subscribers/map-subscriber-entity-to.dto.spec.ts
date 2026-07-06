import { SubscriberEntity } from '@novu/dal';
import { expect } from 'chai';
import { mapSubscriberEntityToDto } from './map-subscriber-entity-to.dto';

describe('mapSubscriberEntityToDto', () => {
  const baseSubscriber = {
    _id: 'subscriber-id',
    subscriberId: 'external-subscriber-id',
    _environmentId: 'environment-id',
    _organizationId: 'organization-id',
    deleted: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
  } as SubscriberEntity;

  it('should normalize null channels to an empty array', () => {
    const subscriber = {
      ...baseSubscriber,
      channels: null,
    } as SubscriberEntity;

    const result = mapSubscriberEntityToDto(subscriber);

    expect(result.channels).to.deep.equal([]);
  });

  it('should normalize undefined channels to an empty array', () => {
    const subscriber = {
      ...baseSubscriber,
      channels: undefined,
    } as SubscriberEntity;

    const result = mapSubscriberEntityToDto(subscriber);

    expect(result.channels).to.deep.equal([]);
  });

  it('should preserve existing channel settings', () => {
    const channels = [
      {
        providerId: 'fcm',
        credentials: { deviceTokens: ['token-1'] },
      },
    ];
    const subscriber = {
      ...baseSubscriber,
      channels,
    } as SubscriberEntity;

    const result = mapSubscriberEntityToDto(subscriber);

    expect(result.channels).to.deep.equal(channels);
  });
});
