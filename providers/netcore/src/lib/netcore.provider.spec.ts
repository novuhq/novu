// eslint-disable-next-line import/first
import { NetCoreProvider } from './netcore.provider';
import axios from 'axios';

const mockConfig = {
  apiKey: 'test-key',
  from: 'netcore',
};

const mockNovuMessage = {
  from: 'test@test1.com',
  to: ['test@test2.com'],
  subject: 'test subject',
  html: '<div> Mail Content </div>',
};

test('should trigger netcore correctly', async () => {
  const id = 'id';
  const netCoreProvider = new NetCoreProvider(mockConfig);

  const spy = jest
    .spyOn(netCoreProvider, 'sendMessage')
    .mockImplementation(async () => {
      return {
        id,
        date: new Date().toISOString(),
      };
    });

  const res = await netCoreProvider.sendMessage(mockNovuMessage);

  expect(spy).toHaveBeenCalled();
  expect(spy).toBeCalledWith(mockNovuMessage);
  expect(res.id).toBe(id);
});
