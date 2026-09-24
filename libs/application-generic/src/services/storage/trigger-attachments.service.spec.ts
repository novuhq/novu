import { PinoLogger } from '../../logging';
import { CacheService } from '../cache/cache.service';
import { StorageService } from './storage.service';
import { TriggerAttachmentsService } from './trigger-attachments.service';

const STORAGE_PATH = 'organization-id/environment-id/random-id/logo.png';

/** In-memory stand-in for the Redis reference counter scripts. */
function buildCounterCache() {
  const counters = new Map<string, number>();

  const evalScript = jest.fn(async (script: string, keys: string[], args: (string | number)[]) => {
    const [key] = keys;
    const current = counters.get(key);
    const isRelease = script.includes('decrby');
    const requiresExistingCounter = isRelease || script.includes("'exists'");

    if (requiresExistingCounter && current === undefined) {
      return null;
    }

    if (!isRelease) {
      const count = (current ?? 0) + Number(args[0]);
      counters.set(key, count);

      return count;
    }

    const count = (current ?? 0) - Number(args[0]);
    if (count <= 0) {
      counters.delete(key);
    } else {
      counters.set(key, count);
    }

    return count;
  });

  return { eval: evalScript, counters };
}

describe('TriggerAttachmentsService', () => {
  const ref = {
    environmentId: 'environment-id',
    transactionId: 'transaction-id',
    attachments: [{ name: 'logo.png', mime: 'image/png', storagePath: STORAGE_PATH }],
  };

  let cache: ReturnType<typeof buildCounterCache>;
  let deleteFile: jest.Mock;
  let logger: { setContext: jest.Mock; warn: jest.Mock };
  let service: TriggerAttachmentsService;

  beforeEach(() => {
    cache = buildCounterCache();
    deleteFile = jest.fn().mockResolvedValue(undefined);
    logger = { setContext: jest.fn(), warn: jest.fn() };
    service = new TriggerAttachmentsService(
      cache as unknown as CacheService,
      { deleteFile } as unknown as StorageService,
      logger as unknown as PinoLogger
    );
  });

  it('deletes the files only after the fan-out hold and every subscriber reference are released', async () => {
    await service.acquireFanOutHold(ref);
    await service.retain(ref, 2);

    await service.release(ref);
    await service.releaseFanOutHold(ref);
    expect(deleteFile).not.toHaveBeenCalled();

    await service.release(ref);
    expect(deleteFile).toHaveBeenCalledTimes(1);
    expect(deleteFile).toHaveBeenCalledWith(STORAGE_PATH);
    expect(cache.counters.size).toBe(0);
  });

  it('deletes the files when the fan-out enqueued no subscribers', async () => {
    await service.acquireFanOutHold(ref);
    await service.releaseFanOutHold(ref);

    expect(deleteFile).toHaveBeenCalledWith(STORAGE_PATH);
  });

  it('keeps the files when a batch of subscriber references could not be retained', async () => {
    await service.acquireFanOutHold(ref);
    cache.eval.mockRejectedValueOnce(new Error('connection lost'));
    await service.retain(ref, 2);
    await service.retain(ref, 1);
    await service.releaseFanOutHold(ref);

    // All three enqueued subscribers still finish their chains.
    await service.release(ref);
    await service.release(ref);
    await service.release(ref);

    expect(deleteFile).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('keeps the files when the fan-out hold could not be acquired', async () => {
    cache.eval.mockRejectedValueOnce(new Error('connection lost'));
    await service.acquireFanOutHold(ref);
    await service.retain(ref, 1);
    await service.releaseFanOutHold(ref);

    await service.release(ref);

    expect(cache.counters.size).toBe(0);
    expect(deleteFile).not.toHaveBeenCalled();
  });

  it('keeps the files when the cache client is unavailable', async () => {
    cache.eval.mockResolvedValue(undefined);

    await service.acquireFanOutHold(ref);
    await service.retain(ref, 2);
    await service.releaseFanOutHold(ref);
    await service.release(ref);

    expect(deleteFile).not.toHaveBeenCalled();
  });

  it('keeps the files when no counter exists for the trigger', async () => {
    await service.release(ref);

    expect(deleteFile).not.toHaveBeenCalled();
  });

  it('does not throw when deleting a file fails', async () => {
    deleteFile.mockRejectedValue(new Error('storage is unavailable'));
    await service.acquireFanOutHold(ref);

    await expect(service.releaseFanOutHold(ref)).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('ignores triggers without stored attachments', async () => {
    const withoutAttachments = { environmentId: 'environment-id', transactionId: 'transaction-id', attachments: [] };

    await service.acquireFanOutHold(withoutAttachments);
    await service.retain(withoutAttachments, 3);
    await service.releaseFanOutHold(withoutAttachments);
    await service.release(withoutAttachments);

    expect(cache.eval).not.toHaveBeenCalled();
    expect(deleteFile).not.toHaveBeenCalled();
  });
});
