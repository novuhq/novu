import { NotFoundException } from '@nestjs/common';
import { GetDecryptedSecretKey } from './get-decrypted-secret-key.usecase';

describe('GetDecryptedSecretKey', () => {
  const command = { environmentId: 'env_1' };

  function usecaseWith(environment: { apiKeys?: Array<{ key: string }> } | null) {
    const environmentRepository = {
      findOne: vi.fn().mockResolvedValue(environment),
    };

    return {
      usecase: new GetDecryptedSecretKey(environmentRepository as never),
      environmentRepository,
    };
  }

  it('returns every active key and keeps the original key first', async () => {
    const { usecase } = usecaseWith({
      apiKeys: [{ key: 'original-key' }, { key: 'rotated-key' }],
    });

    await expect(usecase.executeAll(command as never)).resolves.toEqual(['original-key', 'rotated-key']);
    await expect(usecase.execute(command as never)).resolves.toBe('original-key');
  });

  it('throws when the environment does not exist', async () => {
    const { usecase } = usecaseWith(null);

    await expect(usecase.executeAll(command as never)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when the environment has no secret keys', async () => {
    const { usecase } = usecaseWith({ apiKeys: [] });

    await expect(usecase.execute(command as never)).rejects.toBeInstanceOf(NotFoundException);
  });
});
