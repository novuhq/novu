/* eslint-disable */
import type { SystemStyleObject, ConditionalValue } from '../types/index';
import type { Properties } from '../types/csstype';
import type { SystemProperties } from '../types/style-props';
import type { DistributiveOmit } from '../types/system-types';
import type { Tokens } from '../tokens/index';

export interface WrapProperties {
   gap?: SystemProperties["gap"]
	rowGap?: SystemProperties["gap"]
	columnGap?: SystemProperties["gap"]
	align?: SystemProperties["alignItems"]
	justify?: SystemProperties["justifyContent"]
}


interface WrapStyles extends WrapProperties, DistributiveOmit<SystemStyleObject, keyof WrapProperties > {}

interface WrapPatternFn {
  (styles?: WrapStyles): string
  raw: (styles?: WrapStyles) => SystemStyleObject
}


export declare const wrap: WrapPatternFn;
