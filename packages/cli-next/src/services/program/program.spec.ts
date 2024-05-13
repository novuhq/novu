import { buildProgram } from './program';
import * as echoModule from '../../commands/echo';
import * as syncModule from '../../commands/sync';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid'),
}));

interface IEchoOptions {
  command: 'echo';
  port?: number;
}

interface ISyncOptions {
  command: 'sync';
  backendUrl?: string;
  echoUrl: string;
  apiKey: string;
}

describe('novu-labs cli', () => {
  describe('echo command', () => {
    let echoSpy;

    beforeEach(() => {
      const echoModuleMock = echoModule as jest.Mocked<typeof echoModule>;
      echoSpy = jest.spyOn(echoModuleMock, 'echo');
      echoModuleMock.echo.mockResolvedValue();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('echo command should start echo server on default port', async () => {
      const program = buildProgram();

      const args = process.argv.slice(0, 2);
      const params: IEchoOptions = {
        command: 'echo',
      };

      await program.parse([...args, params.command]);

      expect(echoSpy).toHaveBeenCalledTimes(1);
      expect(echoSpy).toHaveBeenCalledWith(expect.any(String), '2022');
    });

    test('echo command should start echo server on provided port', async () => {
      const program = buildProgram();

      const args = process.argv.slice(0, 2);
      const params: IEchoOptions = {
        command: 'echo',
        port: 3333,
      };
      await program.parse([...args, params.command, '--port', params.port.toString()]);

      expect(echoSpy).toHaveBeenCalledTimes(1);
      expect(echoSpy).toHaveBeenCalledWith(expect.any(String), '3333');
    });

    test('echo command should not failed with different flags', async () => {
      const program = buildProgram();

      const args = process.argv.slice(0, 2);

      await program.parse([...args, 'echo', '-p', '123']);
      await program.parse([...args, 'echo', '--port', '123']);
    });
  });

  describe('sync command', () => {
    let syncSpy;

    beforeEach(() => {
      const syncModuleMock = syncModule as jest.Mocked<typeof syncModule>;
      syncSpy = jest.spyOn(syncModuleMock, 'sync');
      syncModuleMock.sync.mockResolvedValue({ someData: 'response from sync' });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('sync command should call sync module with with minimum required options: `echoUrl` and `apiKey`.', async () => {
      const program = buildProgram();

      const args = process.argv.slice(0, 2);
      const params: ISyncOptions = {
        command: 'sync',
        echoUrl: 'http://localhost:8080',
        apiKey: 'your-api-key',
      };

      await program.parse([...args, 'sync', '--echo-url', params.echoUrl, '--api-key', params.apiKey]);

      const defaultBackendUrl = 'https://api.novu.co';
      expect(syncSpy).toHaveBeenCalledTimes(1);
      expect(syncSpy).toHaveBeenCalledWith(params.echoUrl, params.apiKey, defaultBackendUrl);
    });

    test("sync command should call sync module with all options: `echoUrl`, 'backendUrl', and `apiKey`.", async () => {
      const program = buildProgram();
      const args = process.argv.slice(0, 2);
      const params = {
        command: 'sync',
        backendUrl: 'https://api.novu.co',
        echoUrl: 'http://localhost:8080',
        apiKey: 'your-api-key',
      };

      await program.parse([
        ...args,
        'sync',
        '--echo-url',
        params.echoUrl,
        '--api-key',
        params.apiKey,
        '--backend-url',
        params.backendUrl,
      ]);

      expect(syncSpy).toHaveBeenCalledTimes(1);
      expect(syncSpy).toHaveBeenCalledWith(params.echoUrl, params.apiKey, params.backendUrl);
    });

    test('echo command should not failed with different flags', async () => {
      const program = buildProgram();

      const args = process.argv.slice(0, 2);

      await program.parse([
        ...args,
        'sync',
        '--backend-url',
        'mockBackendUrl',
        '--echo-url',
        'mockUrl',
        '--api-key',
        'mockApiKey',
      ]);
      await program.parse([
        ...args,
        'sync',
        '-b',
        'mockBackendUrl',
        '--echo-url',
        'mockUrl',
        '--api-key',
        'mockApiKey',
      ]);
    });
  });
});
