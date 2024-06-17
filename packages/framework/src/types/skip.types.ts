import { Awaitable } from './util.types';

export type Skip<T> = (inputs: T) => Awaitable<boolean>;
