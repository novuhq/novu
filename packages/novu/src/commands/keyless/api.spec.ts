import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type KeylessApiStub, startKeylessApiStub } from './__fixtures__/keyless-api-stub';
import { createKeylessEnvironment, getKeylessEnvironment, KeylessApiError } from './api';

let stub: KeylessApiStub;

beforeEach(async () => {
  stub = await startKeylessApiStub();
});

afterEach(async () => {
  await stub.close();
});

describe('keyless api', () => {
  it('sends an empty body when no source is given', async () => {
    stub.respond('POST /v1/keyless/environments', { status: 201, body: { data: { environmentId: 'env_1' } } });

    await createKeylessEnvironment({ apiUrl: stub.apiUrl });

    expect(stub.requests[0].body).toEqual({});
  });

  it('keeps the API message and code for unmapped errors', async () => {
    stub.respond('GET /v1/keyless/environments/me', {
      status: 401,
      body: { statusCode: 401, code: 'keyless_environment_expired', message: 'Expired on 2026-10-17.' },
    });

    const error = await getKeylessEnvironment({ apiUrl: stub.apiUrl, secretKey: 'sk_1' }).catch((e) => e);

    expect(error).toBeInstanceOf(KeylessApiError);
    expect(error).toMatchObject({
      status: 401,
      code: 'keyless_environment_expired',
      message: 'Expired on 2026-10-17.',
    });
  });

  it('rejects a success response without a data envelope', async () => {
    stub.respond('POST /v1/keyless/environments', { status: 201, body: { environmentId: 'env_1' } });

    await expect(createKeylessEnvironment({ apiUrl: stub.apiUrl })).rejects.toThrow('unexpected response');
  });

  it('reports an unreachable API with status 0', async () => {
    const { apiUrl } = stub;
    await stub.close();
    stub = await startKeylessApiStub();

    const error = await createKeylessEnvironment({ apiUrl }).catch((e) => e);

    expect(error).toBeInstanceOf(KeylessApiError);
    expect(error.status).toBe(0);
    expect(error.message).toContain('Could not reach the Novu API');
  });
});
