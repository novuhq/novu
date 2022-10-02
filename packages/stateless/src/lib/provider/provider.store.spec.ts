import { ChannelTypeEnum } from '../template/template.interface';
import { CheckIntegrationResponseEnum } from './provider.enum';
import { ProviderStore } from './provider.store';

test('should register a provider', async () => {
  const store = new ProviderStore();

  await store.addProvider('sms', {
    id: 'test',
    channelType: ChannelTypeEnum.SMS,
    sendMessage: () =>
      Promise.resolve({ id: '1', date: new Date().toString() }),
  });

  const providers = await store.getProviders();

  expect(providers.length).toEqual(1);
  expect(providers[0].id).toEqual('test');
});

test('should get a provider by id', async () => {
  const store = new ProviderStore();

  await store.addProvider('sms', {
    id: 'test',
    channelType: ChannelTypeEnum.SMS,
    sendMessage: () =>
      Promise.resolve({ id: '1', date: new Date().toString() }),
  });

  await store.addProvider('email', {
    id: 'test 2',
    channelType: ChannelTypeEnum.EMAIL,
    sendMessage: () =>
      Promise.resolve({ id: '1', date: new Date().toString() }),
    checkIntegration: () =>
      Promise.resolve({
        message: 'test',
        success: true,
        code: CheckIntegrationResponseEnum.SUCCESS,
      }),
  });

  const provider = await store.getProviderByInternalId('test');

  expect(provider).toBeTruthy();
  expect(provider?.id).toEqual('test');
});

test('should get a provider by channel', async () => {
  const store = new ProviderStore();

  await store.addProvider('sms', {
    id: 'test',
    channelType: ChannelTypeEnum.SMS,
    sendMessage: () =>
      Promise.resolve({ id: '1', date: new Date().toString() }),
  });

  await store.addProvider('email', {
    id: 'test 2',
    channelType: ChannelTypeEnum.EMAIL,
    sendMessage: () =>
      Promise.resolve({ id: '1', date: new Date().toString() }),
    checkIntegration: () =>
      Promise.resolve({
        message: 'test',
        success: true,
        code: CheckIntegrationResponseEnum.SUCCESS,
      }),
  });

  const provider = await store.getProviderByChannel(ChannelTypeEnum.EMAIL);

  expect(provider).toBeTruthy();
  expect(provider?.id).toEqual('test 2');
});
