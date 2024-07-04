import type { Awaitable } from './util.types';

export type Skip<T> = (controls: T) => Awaitable<boolean>;
