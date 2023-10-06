import { RyverChatProvider } from './ryver.provider';
import axios, { AxiosResponse } from 'axios';

// Mock axios.post method
jest.mock('axios');

test('RyverChatProvider should send a message successfully', async () => {
  // Create an instance of RyverChatProvider
  const ryverProvider = new RyverChatProvider();

  // Define mock data and response
  const mockOptions = {
    webhookUrl: 'https://example.com/webhook',
    content: 'Test message',
  };

  const mockResponse: AxiosResponse = {
    data: {
      id: 'messageId',
      timestamp: '2023-10-06T12:00:00Z',
    },
    status: 200,
    statusText: 'OK',
    headers: {}, // Include an empty headers object
    config: {
      headers: undefined,
    },
  };

  // Mock the axios.post method to return the mockResponse
  (axios.post as jest.MockedFunction<typeof axios.post>).mockResolvedValue(
    mockResponse
  );

  // Call the sendMessage method
  const result = await ryverProvider.sendMessage(mockOptions);

  // Assertions
  expect(result).toEqual({
    id: 'messageId',
    date: '2023-10-06T12:00:00Z',
  });

  // Ensure that axios.post was called with the correct arguments
  expect(axios.post).toHaveBeenCalledWith('https://example.com/webhook', {
    content: 'Test message',
  });
});
