import { RingCentralSmsProvider } from './ring-central.provider';

test('should trigger ring-central library correctly', async () => {
  const provider = new RingCentralSmsProvider({
    clientId: '<clientId>',
    clientSecret: '<clientSecret>',
    isSandBox: true,
    jwtToken: '<jwtToken>',
    from: '<fromNumber>',
  });

  const spyonLoggedIn = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    .spyOn(provider.rcClient, 'loggedIn')
    .mockImplementation(async () => {
      return false;
    });

  const spyOnLogin = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    .spyOn(provider.rcClient, 'login')
    .mockImplementation(async () => {
      return {
        headers: {},
        ok: true,
        redirected: false,
        status: 200,
      } as Response;
    });

  const spyOnPost = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    .spyOn(provider.rcClient, 'post')
    .mockImplementation(async () => {
      return {
        headers: {},
        ok: true,
        redirected: false,
        status: 200,
        json: async () => {
          return {
            id: '1',
            creationTime: new Date(),
          };
        },
      } as Response;
    });

  await provider.sendMessage({
    to: '+176543',
    content: 'SMS Content',
    from: '+112345',
  });

  expect(spyonLoggedIn).toHaveBeenCalledTimes(1);
  expect(spyOnLogin).toHaveBeenCalledTimes(1);
  expect(spyOnPost).toHaveBeenCalled();
  expect(spyOnPost).toHaveBeenCalledWith(
    '/restapi/v1.0/account/~/extension/~/sms',
    {
      from: { phoneNumber: '+112345' },
      to: [{ phoneNumber: '+176543' }],
      text: 'SMS Content',
    }
  );
});

test('should not login if already logged in', async () => {
  const provider = new RingCentralSmsProvider({
    clientId: '<clientId>',
    clientSecret: '<clientSecret>',
    isSandBox: true,
    jwtToken: '<jwtToken>',
    from: '+112345',
  });

  const spyonLoggedIn = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    .spyOn(provider.rcClient, 'loggedIn')
    .mockImplementation(async () => {
      return true;
    });

  const spyOnLogin = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    .spyOn(provider.rcClient, 'login')
    .mockImplementation(async () => {
      return {
        headers: {},
        ok: true,
        redirected: false,
        status: 200,
      } as Response;
    });

  const spyOnPost = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    .spyOn(provider.rcClient, 'post')
    .mockImplementation(async () => {
      return {
        headers: {},
        ok: true,
        redirected: false,
        status: 200,
        json: async () => {
          return {
            id: '1',
            creationTime: new Date(),
          };
        },
      } as Response;
    });

  await provider.sendMessage({
    to: '+176543',
    content: 'SMS Content',
  });

  expect(spyonLoggedIn).toHaveBeenCalledTimes(1);
  expect(spyOnLogin).toHaveBeenCalledTimes(0);
  expect(spyOnPost).toHaveBeenCalled();
  expect(spyOnPost).toHaveBeenCalledWith(
    '/restapi/v1.0/account/~/extension/~/sms',
    {
      from: { phoneNumber: '+112345' },
      to: [{ phoneNumber: '+176543' }],
      text: 'SMS Content',
    }
  );
});

test('should only use config.from if options.from is not provided', async () => {
  const provider = new RingCentralSmsProvider({
    clientId: '<clientId>',
    clientSecret: '<clientSecret>',
    isSandBox: true,
    jwtToken: '<jwtToken>',
    from: '+112345',
  });

  const spyonLoggedIn = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    .spyOn(provider.rcClient, 'loggedIn')
    .mockImplementation(async () => {
      return true;
    });

  const spyOnPost = jest
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    .spyOn(provider.rcClient, 'post')
    .mockImplementation(async () => {
      return {
        headers: {},
        ok: true,
        redirected: false,
        status: 200,
        json: async () => {
          return {
            id: '1',
            creationTime: new Date(),
          };
        },
      } as Response;
    });

  await provider.sendMessage({
    to: '+176543',
    content: 'SMS Content',
  });

  expect(spyOnPost).toHaveBeenCalled();
  expect(spyOnPost).toHaveBeenCalledWith(
    '/restapi/v1.0/account/~/extension/~/sms',
    {
      from: { phoneNumber: '+112345' },
      to: [{ phoneNumber: '+176543' }],
      text: 'SMS Content',
    }
  );
});
