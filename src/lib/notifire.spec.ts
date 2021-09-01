import { Notifire } from './notifire';
import { ChannelTypeEnum } from './template/template.interface';

test('should register an SMS provider and return it', async () => {
  const notifire = new Notifire();

  const template = {
    id: 'test',
    channelType: ChannelTypeEnum.SMS,
    sendMessage: () => null,
  };

  await notifire.registerProvider(template);
  const provider = await notifire.getProviderById('test');

  expect(provider).toBeTruthy();
  expect(provider.id).toEqual('test');
});
