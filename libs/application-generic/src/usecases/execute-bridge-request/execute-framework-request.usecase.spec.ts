import { createHmac } from 'node:crypto';
import { GetActionEnum, HttpHeaderKeysEnum, PostActionEnum } from '@novu/framework/internal';
import { ResourceOriginEnum } from '@novu/shared';
import { encryptApiKey } from '../../encryption';
import { HttpClientError, HttpClientErrorType } from '../../services/http-client';
import { clearAcceptedSigningKeys } from '../../utils/bridge-signing-keys';
import { ExecuteFrameworkRequest } from './execute-framework-request.usecase';

const BRIDGE_URL = 'https://bridge.example.com/api/novu';

function signatureMismatch(): HttpClientError {
  return new HttpClientError({
    type: HttpClientErrorType.HTTP_ERROR,
    message: 'Response code 401 (Unauthorized)',
    statusCode: 401,
    responseBody: { code: 'SignatureMismatchError', message: 'Signature does not match', data: {} },
  });
}

function firstSignatureMatches(header: string, secretKey: string, event: unknown): boolean {
  const parts = header.split(',');
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2);
  const firstV1 = parts.find((part) => part.startsWith('v1='))?.slice(3);
  const expected = createHmac('sha256', secretKey)
    .update(`${timestamp}.${JSON.stringify(event)}`)
    .digest('hex');

  return firstV1 === expected;
}

/**
 * Simulates a bridge on an older `@novu/framework` that checks only the first
 * `v1`, configured with `bridgeKey`.
 */
function bridgeOnKey(bridgeKey: string) {
  return vi.fn(async (options: { headers: Record<string, string>; body: unknown }) => {
    if (!firstSignatureMatches(options.headers[HttpHeaderKeysEnum.NOVU_SIGNATURE], bridgeKey, options.body ?? {})) {
      throw signatureMismatch();
    }

    return { body: { outputs: {}, providers: {}, options: {}, metadata: {} } };
  });
}

function setup(request: ReturnType<typeof vi.fn>, keys: string[] = ['original-key', 'rotated-key']) {
  const environment = {
    _id: 'env_1',
    name: 'Production',
    bridge: { url: BRIDGE_URL },
    apiKeys: keys.map((key) => ({ key: encryptApiKey(key) })),
  };
  const logger = { setContext: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const usecase = new ExecuteFrameworkRequest({} as never, {} as never, logger as never, { request } as never);

  const command = {
    environmentId: 'env_1',
    environment,
    action: PostActionEnum.EXECUTE,
    workflowOrigin: ResourceOriginEnum.EXTERNAL,
    event: { workflowId: 'welcome', stepId: 'email', payload: {} },
    retriesLimit: 0,
  };

  return { usecase, command, logger };
}

describe('ExecuteFrameworkRequest signing during a key rotation', () => {
  beforeEach(() => {
    clearAcceptedSigningKeys();
  });

  it('sends one request when the bridge accepts the first signature', async () => {
    const request = bridgeOnKey('original-key');
    const { usecase, command } = setup(request);

    await usecase.execute(command as never);

    expect(request).toHaveBeenCalledTimes(1);
  });

  it('resends once with the other key first when an older bridge moved to the new key', async () => {
    const request = bridgeOnKey('rotated-key');
    const { usecase, command } = setup(request);

    await expect(usecase.execute(command as never)).resolves.toBeDefined();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('remembers the accepted key so later requests succeed on the first try', async () => {
    const request = bridgeOnKey('rotated-key');
    const { usecase, command } = setup(request);

    await usecase.execute(command as never);
    request.mockClear();
    await usecase.execute(command as never);

    expect(request).toHaveBeenCalledTimes(1);
  });

  it('does not resend for an environment with a single key', async () => {
    const request = bridgeOnKey('some-other-key');
    const { usecase, command } = setup(request, ['only-key']);

    await expect(usecase.execute(command as never)).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('stops after every key was tried first once', async () => {
    const request = bridgeOnKey('unknown-key');
    const { usecase, command } = setup(request);

    await expect(usecase.execute(command as never)).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('does not resend for other 401 errors', async () => {
    const request = vi.fn().mockRejectedValue(
      new HttpClientError({
        type: HttpClientErrorType.HTTP_ERROR,
        message: 'Response code 401 (Unauthorized)',
        statusCode: 401,
        responseBody: { code: 'SignatureExpiredError', message: 'expired', data: {} },
      })
    );
    const { usecase, command } = setup(request);

    await expect(usecase.execute(command as never)).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('resends GET actions the same way', async () => {
    const request = bridgeOnKey('rotated-key');
    const { usecase, command } = setup(request);

    await usecase.execute({ ...command, action: GetActionEnum.HEALTH_CHECK, event: undefined } as never);

    expect(request).toHaveBeenCalledTimes(2);
  });
});
