import { Redis } from 'ioredis';
import { CachingConfig, ICacheService } from './cache.service';

export const MockCacheService = {
  createClient(mockClient?: Partial<Redis>): ICacheService {
    const data = {};

    return {
      incrIfExistsAtomic(key: string): Promise<number> {
        const newValue = (data[key] || 0) + 1;
        data[key] = newValue;

        return newValue;
      },
      incr(key: string): Promise<number> {
        const newValue = (data[key] || 0) + 1;
        data[key] = newValue;

        return newValue;
      },
      set(key: string, value: string, options?: CachingConfig) {
        data[key] = value;
      },
      get(key: string) {
        return data[key];
      },
      del(key: string) {
        delete data[key];
      },
      delByPattern(pattern?: string) {
        const preFixSuffixTuple = pattern?.split('*');

        if (!preFixSuffixTuple) return;

        for (const key in data) {
          if (key.startsWith(preFixSuffixTuple[0]) && key.endsWith(preFixSuffixTuple[1])) delete data[key];
        }
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
        const dataVal = data[key];
        if (dataVal && !Array.isArray(dataVal)) {
          throw new Error('Wrong operation against a key holding the wrong kind of value');
        }

        const newVal = new Set(data[key]);

        let addCount = 0;
        members.forEach((member) => {
          if (!newVal.has(member)) {
            newVal.add(member);
            addCount += 1;
          }
        });
        data[key] = Array.from(newVal);

        return addCount;
      },
      async eval<TData = unknown>(script: string, keys: string[], args: (string | Buffer | number)[]): Promise<TData> {
        return mockClient.eval(script, keys.length, ...keys, ...args) as TData;
      },
    };
  },
};
