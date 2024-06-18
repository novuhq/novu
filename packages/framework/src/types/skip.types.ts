import { Awaitable } from './util.types';

export type Skip<T = any> = (inputs: any) => Awaitable<boolean>;
