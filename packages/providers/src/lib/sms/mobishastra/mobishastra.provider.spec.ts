import { expect, test } from 'vitest';
import { MobishastraProvider } from './mobishastra.provider';
import { axiosSpy } from '../../../utils/test/spy-axios';

const baseUrl = 'https://mshastra.com/sendsms_api_json.aspx';
const senderName = 'sender-name';
const testMobileNumber = '+123456789';
const smsMessageContent = 'SMS Content form Mobishastra SMS Provider';
const username = 'profile-username';
const password = 'profile-password';

const providerOptions = {
  baseUrl,
  from: senderName,
  username,
  password,
};

const options = {
  to: testMobileNumber,
  from: senderName,
  content: smsMessageContent,
};

test('should trigger Mobishastra library correctly', async () => {
  const { mockRequest: spy } = axiosSpy({
    data: [
      {
        msg_id: '123',
        str_response: 'Message Sent',
      },
    ],
  });

  const provider = new MobishastraProvider(providerOptions);

  await provider.sendMessage(options);

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    method: 'POST',
    data: JSON.stringify([
      {
        Sender: senderName,
        number: testMobileNumber,
        msg: smsMessageContent,
        user: username,
        pwd: password,
      },
    ]),
    headers: {},
  });
});

test('should trigger Mobishastra library correctly with _passthrough', async () => {
  const { mockRequest: spy } = axiosSpy({
    data: [
      {
        msg_id: '123',
        str_response: 'Message Sent',
      },
    ],
  });

  const provider = new MobishastraProvider(providerOptions);

  await provider.sendMessage(options, {
    _passthrough: {
      body: {
        number: '+223456789',
      },
    },
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    method: 'POST',
    data: JSON.stringify([
      {
        Sender: senderName,
        number: '+223456789',
        msg: smsMessageContent,
        user: username,
        pwd: password,
      },
    ]),
    headers: {},
  });
});
