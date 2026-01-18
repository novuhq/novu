/* eslint-disable */
import type { SystemStyleObject, ConditionalValue } from '../types/index';
import type { Properties } from '../types/csstype';
import type { SystemProperties } from '../types/style-props';
import type { DistributiveOmit } from '../types/system-types';
import type { Tokens } from '../tokens/index';

export interface CenterProperties {
   inline?: ConditionalValue<boolean>
}


interface CenterStyles extends CenterProperties, DistributiveOmit<SystemStyleObject, keyof CenterProperties > {}

interface CenterPatternFn {
  (styles?: CenterStyles): string
  raw: (styles?: CenterStyles) => SystemStyleObject
}


export declare const center: CenterPatternFn;
