import { Novu } from './novu';

const mockConfig = {
  apiKey: '1234',
};

test('should trigger correctly', async () => {
  const novu = new Novu(mockConfig.apiKey);

  const spy = jest.spyOn(novu, 'trigger').mockImplementation(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {} as any;
  });

  await novu.trigger('test-template', {
    $user_id: 'test-user',
    $email: 'test-user@sd.com',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith('test-template', {
    $user_id: 'test-user',
    $email: 'test-user@sd.com',
  });
});
