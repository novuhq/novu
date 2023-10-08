import { RyverChatProvider } from './ryver.provider';
import axios from 'axios';

// Create a mock function for Axios post method
jest.mock('axios');
const axiosPostMock = jest.fn();

// Replace the Axios post method with the mock function
axios.post = axiosPostMock;

// Create a mock response for Axios
const mockResponse = {
  data: {
    d: {
      id: '12345',
    },
  },
};

describe('RyverChatProvider', () => {
  let ryverProvider;

  beforeAll(() => {
    ryverProvider = new RyverChatProvider({
      userId: 'your-username',
      password: 'your-password',
      clientId: 'workrooms-id',
    });
  });

  it('should send a chat message successfully', async () => {
    // Mock the Axios post method to simulate a resolved Promise
    axiosPostMock.mockResolvedValue(mockResponse);

    const chatOptions = {
      content: 'This is an example chat message',
      password: 'your-password',
    };

    const result = await ryverProvider.sendMessage(chatOptions);
    const workroomsPath = `/workrooms(${ryverProvider?.clientId})/Chat.PostMessage()`;

    // Assert that Axios.post was called with the correct arguments
    expect(axiosPostMock).toHaveBeenCalledWith(
      RyverChatProvider.BASE_URL + workroomsPath,
      {
        createSource: {
          displayName: 'Ryver API',
        },
        body: 'This is an example chat message',
      },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Basic eW91ci11c2VybmFtZTp5b3VyLXBhc3N3b3Jk', // Base64-encoded username:password
        },
      }
    );

    // Assert that the result matches the expected response
    expect(result).toEqual({
      id: '12345',
      date: expect.any(String), // We can't predict the exact date in the test
    });
  });
});
