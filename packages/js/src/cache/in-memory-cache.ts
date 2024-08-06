import type { Cache } from './types';

export class InMemoryCache<T> implements Cache<T> {
  #cache: Map<string, T>;

  constructor() {
    this.#cache = new Map();
  }

  get(key: string): T | undefined {
    return this.#cache.get(key);
  }

  getValues(): T[] {
    return Array.from(this.#cache.values());
  }

  entries(): [string, T][] {
    return Array.from(this.#cache.entries());
  }

  keys(): string[] {
    return Array.from(this.#cache.keys());
  }

  set(key: string, value: T): void {
    this.#cache.set(key, value);
  }

  remove(key: string): void {
    this.#cache.delete(key);
  }

  clear(): void {
    this.#cache.clear();
  }
}
