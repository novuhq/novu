import { Redis } from 'ioredis';
import { CachingConfig, ICacheService } from './cache.service';

// eslint-disable-next-line @typescript-eslint/naming-convention
export const MockCacheService = {
  createClient(mockClient?: Partial<Redis>): ICacheService {
    const data = {};

    return {
      set(key: string, value: string, options?: CachingConfig) {
        data[key] = value;
      },
      get(key: string) {
        return data[key];
      },
      del(key: string) {
        delete data[key];

        return;
      },
      delByPattern(pattern?: string) {
        const preFixSuffixTuple = pattern?.split('*');

        if (!preFixSuffixTuple) return;

        for (const key in data) {
          if (
            key.startsWith(preFixSuffixTuple[0]) &&
            key.endsWith(preFixSuffixTuple[1])
          )
            delete data[key];
        }

        return;
      },
      keys(pattern?: string) {
        return Object.keys(data);
      },
      getStatus() {
        return 'ready';
      },
      cacheEnabled() {
        return true;
      },
      async sadd(key, ...members) {
        let val = data[key];
        if (val && !(val instanceof Set)) {
          throw new Error(
            'WRONGTYPE Operation against a key holding the wrong kind of value'
          );
        }
        if (!val) {
          val = new Set();
        }

        let addCount = 0;
        members.forEach((member) => {
          if (!val.has(member)) {
            val.add(member);
            addCount++;
          }
        });
        data[key] = val;

        return addCount;
      },
      async eval<TData = unknown>(
        script: string,
        keys: string[],
        args: (string | Buffer | number)[]
      ): Promise<TData> {
        return mockClient.eval(script, keys.length, ...keys, ...args) as TData;
      },
    };
  },
};
