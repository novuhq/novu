import GraphAPI from '@microsoft/microsoft-graph-client';
import { MSGraphConfig } from './msgraph.config';
import { MSGraphAPIProvider } from './msgraph.provider';

const mockResponse = { id: 'mock-message-id' };
jest.mock('@microsoft/microsoft-graph-client', () => ({
  Client: {
    initWithMiddleware() {
      return {
        api() {
          return {
            async post() {
              return mockResponse;
            },
          };
        },
      };
    },
  },
}));

test('should trigger ses library correctly', async () => {
  const mockConfig: MSGraphConfig = {
    authority: 'thisIstheAuthorityFromAzure/thisIsTheTenantFromAzure',
    clientId: 'thisIsAClientIdFromAzure',
    fromAddress: 'test@novu.dev',
    fromName: 'novu-mock',
    scopes: '',
    secret: 'thisIsASecretFromAzure',
    user: 'test@novu.dev',
  };
  const provider = new MSGraphAPIProvider(mockConfig);
  const mockNovuMessage = {
    to: 'test@test2.com',
    subject: 'test subject',
    html: '<div> Mail Content </div>',
    attachments: [
      { mime: 'text/plain', file: Buffer.from('test'), name: 'test.txt' },
    ],
  };
  const response = await provider.sendMessage(mockNovuMessage);
  expect(response.id).toEqual('mock-message-id');
});
