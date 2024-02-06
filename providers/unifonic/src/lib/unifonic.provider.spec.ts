import axios from 'axios';
import { UnifonicSmsProvider } from './unifonic.provider';

const mockConfig = {
  AppSid: 'I0tn4MU17MPaI6aTRcXmAnpsdCthjI',
  SenderID: 'NEOM',
  baseUrl: 'https://el.cloud.unifonic.com/rest/SMS/messages',
};

const mockNovuMessage = {
  to: '+966531293126',
  content: 'Assalam o Alaikum',
};

test('should trigger unifonic library correctly', async () => {
  const fakePost = jest.fn(() => {
    return Promise.resolve('0');
  });

  jest.spyOn(axios, 'post').mockImplementation(fakePost);

  const provider = new UnifonicSmsProvider(mockConfig);

  await provider.sendMessage(mockNovuMessage);

  const data = {
    AppSid: mockConfig.AppSid,
    SenderID: mockConfig.SenderID,
    Recipient: mockNovuMessage.to,
    Body: mockNovuMessage.content,
  };

  expect(fakePost).toBeCalled();
  expect(fakePost).toBeCalledWith(mockConfig.baseUrl, data);
});
