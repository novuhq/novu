import { MaybePromise } from './util.types';

export type Skip<T_Inputs = any> = (inputs: T_Inputs) => MaybePromise<boolean>;
