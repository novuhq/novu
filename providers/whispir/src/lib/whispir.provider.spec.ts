import { whispirSmsProvider } from './whispir.provider';

test('should trigger whispir correctly', async () => {
  const provider = new whispirSmsProvider({
    username: "john.smith",
      password: "one2three",
      apiKey: "ds0dsf09hdfsh90df90hdfsj",
  });
});
