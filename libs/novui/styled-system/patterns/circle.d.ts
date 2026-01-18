/* eslint-disable */
import type { SystemStyleObject, ConditionalValue } from '../types/index';
import type { Properties } from '../types/csstype';
import type { SystemProperties } from '../types/style-props';
import type { DistributiveOmit } from '../types/system-types';
import type { Tokens } from '../tokens/index';

export interface CircleProperties {
   size?: SystemProperties["width"]
}


interface CircleStyles extends CircleProperties, DistributiveOmit<SystemStyleObject, keyof CircleProperties > {}

interface CirclePatternFn {
  (styles?: CircleStyles): string
  raw: (styles?: CircleStyles) => SystemStyleObject
}


export declare const circle: CirclePatternFn;
