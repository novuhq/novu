import { RingCentralSmsProvider } from './ringcentral.provider';

test('should trigger ringcentral library correctly', async () => {
  const provider = new RingCentralSmsProvider({
    server: 'https://platform.devtest.ringcentral.com/',
    clientId: 'vFjolfC_T1SgvHeaLsMWgQ',
    clientSecret: 'I5Ly52vzQqObjPV6SiyeiATKJTF763RcmE_bXonKm9zQ',
    username: '+13136362498',
    password: 'RAJwc9$DgUmZK?g',
    extension: '101',
  });

  const isLoggedIn = await provider.login();

  if (!isLoggedIn) {
    return;
  }

  const result = await provider.sendMessage({
    to: '+14153419909',
    content: 'Hello World',
  });

  expect(result).toEqual({
    id: expect.any(Number),
    date: expect.any(String),
  });
});
