/* eslint-disable */
import type { SystemStyleObject, ConditionalValue } from '../types/index';
import type { Properties } from '../types/csstype';
import type { SystemProperties } from '../types/style-props';
import type { DistributiveOmit } from '../types/system-types';
import type { Tokens } from '../tokens/index';

export interface FlexProperties {
   align?: SystemProperties["alignItems"]
	justify?: SystemProperties["justifyContent"]
	direction?: SystemProperties["flexDirection"]
	wrap?: SystemProperties["flexWrap"]
	basis?: SystemProperties["flexBasis"]
	grow?: SystemProperties["flexGrow"]
	shrink?: SystemProperties["flexShrink"]
}


interface FlexStyles extends FlexProperties, DistributiveOmit<SystemStyleObject, keyof FlexProperties > {}

interface FlexPatternFn {
  (styles?: FlexStyles): string
  raw: (styles?: FlexStyles) => SystemStyleObject
}


export declare const flex: FlexPatternFn;
