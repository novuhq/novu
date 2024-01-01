import { TwilioVoiceProvider } from './twilio-voice.provider';

test('should trigger twilio-voice library correctly', async () => {
  const provider = new TwilioVoiceProvider({
    accountSid: 'AC<twilio-account-Sid>',
    authToken: '<twilio-auth-Token>',
    from: '+112345',
  });
  const response = {
    dateCreated: new Date(),
    sid: 'sid',
  } as any;
  const spy = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    .spyOn(provider.twilioClient.calls, 'create')
    .mockImplementation(async () => {
      return response;
    });

  const res = await provider.sendMessage({
    to: '+176543',
    content: 'SMS Content',
    language: 'en-US',
    record: true,
    voice: 'alice',
  });

  expect(spy).toHaveBeenCalledWith({
    from: '+112345',
    to: '+176543',
    record: true,
    twiml: expect.any(Object),
  });
  expect(res).toEqual({
    id: response.sid,
    date: expect.any(String),
  });
});
