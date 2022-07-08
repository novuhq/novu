const createGeneratethemailsendrequest = jest.fn();

// eslint-disable-next-line import/first
import { NetCoreProvider } from './netcore.provider';
import * as lib from 'pepipost/lib';

jest.mock('pepipost/lib', () => {
  const actual = jest.requireActual('pepipost/lib');
  if (typeof actual !== 'object') {
    return {
      MailSendController: {
        createGeneratethemailsendrequest,
      },
      Configuration: {
        apiKey: '',
      },
    };
  }

  return {
    ...actual,
    MailSendController: {
      createGeneratethemailsendrequest,
    },
    Configuration: {
      apiKey: '',
    },
  };
});

const mockNovuMessage = {
  from: 'test@test1.com',
  to: 'test@test2.com',
  subject: 'test subject',
  html: '<div> Mail Content </div>',
};

test('should trigger netcore correctly', async () => {
  const id = 'id';
  const apiKey = 'apiKey';
  const provider = new NetCoreProvider({
    apiKey,
    from: 'test@test.com',
  });
  createGeneratethemailsendrequest.mockReturnValue({
    data: {
      message_id: id,
    },
  });

  const res = await provider.sendMessage(mockNovuMessage);

  expect(createGeneratethemailsendrequest).toHaveBeenCalled();
  const args = createGeneratethemailsendrequest.mock.calls[0][0];
  expect(args.from.email).toBe(mockNovuMessage.from);
  expect(args.subject).toBe(mockNovuMessage.subject);
  expect(args.content[0].value).toBe(mockNovuMessage.html);
  expect(args.content[0].type).toBe('html');
  expect(args.personalizations[0].to[0].email).toBe(mockNovuMessage.to);
  expect(lib.Configuration.apiKey).toBe(apiKey);
  expect(res.id).toBe('id');
});
