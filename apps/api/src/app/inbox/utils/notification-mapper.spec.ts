import { ChannelTypeEnum } from '@novu/dal';
import { ChannelCTATypeEnum, ResourceOriginEnum, ResourceTypeEnum } from '@novu/shared';
import { expect } from 'chai';

import { mapToDto } from './notification-mapper';

const baseMessage = {
  _id: 'message-id',
  transactionId: 'transaction-id',
  content: 'Hello',
  read: false,
  seen: false,
  archived: false,
  createdAt: '2024-01-01T00:00:00.000Z',
  channel: ChannelTypeEnum.IN_APP,
  subscriber: {
    _id: 'subscriber-id',
    subscriberId: 'subscriber-id',
  },
  cta: {
    type: ChannelCTATypeEnum.REDIRECT,
    data: {},
  },
};

describe('notification-mapper', () => {
  it('returns v2 data when message.data is set', () => {
    const result = mapToDto({
      ...baseMessage,
      data: { orderId: '123' },
      payload: { orderId: '123', secret: 'hidden' },
      template: {
        _id: 'template-id',
        name: 'v2 workflow',
        type: ResourceTypeEnum.BRIDGE,
        origin: ResourceOriginEnum.NOVU_CLOUD,
      },
    } as any);

    expect(result.data).to.deep.equal({ orderId: '123' });
  });

  it('returns payload as data for v0 workflow notifications without data', () => {
    const payload = { orderId: '456', customerName: 'Jane' };

    const result = mapToDto({
      ...baseMessage,
      payload,
      template: {
        _id: 'template-id',
        name: 'v0 workflow',
        type: ResourceTypeEnum.REGULAR,
        origin: ResourceOriginEnum.NOVU_CLOUD_V1,
      },
    } as any);

    expect(result.data).to.deep.equal(payload);
  });

  it('returns payload as data for legacy v0 workflows without origin or type', () => {
    const payload = { foo: 'bar' };

    const result = mapToDto({
      ...baseMessage,
      payload,
      template: {
        _id: 'template-id',
        name: 'legacy workflow',
      },
    } as any);

    expect(result.data).to.deep.equal(payload);
  });

  it('does not return payload as data for v2 workflows without data', () => {
    const result = mapToDto({
      ...baseMessage,
      payload: { orderId: '789' },
      template: {
        _id: 'template-id',
        name: 'v2 workflow',
        type: ResourceTypeEnum.BRIDGE,
        origin: ResourceOriginEnum.NOVU_CLOUD,
      },
    } as any);

    expect(result.data).to.be.undefined;
  });
});
