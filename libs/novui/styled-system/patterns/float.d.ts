/* eslint-disable */
import type { SystemStyleObject, ConditionalValue } from '../types/index';
import type { Properties } from '../types/csstype';
import type { SystemProperties } from '../types/style-props';
import type { DistributiveOmit } from '../types/system-types';
import type { Tokens } from '../tokens/index';

export interface FloatProperties {
   offsetX?: ConditionalValue<Tokens["spacing"] | Properties["left"]>
	offsetY?: ConditionalValue<Tokens["spacing"] | Properties["top"]>
	offset?: ConditionalValue<Tokens["spacing"] | Properties["top"]>
	placement?: ConditionalValue<"bottom-end" | "bottom-start" | "top-end" | "top-start" | "bottom-center" | "top-center" | "middle-center" | "middle-end" | "middle-start">
}


interface FloatStyles extends FloatProperties, DistributiveOmit<SystemStyleObject, keyof FloatProperties > {}

interface FloatPatternFn {
  (styles?: FloatStyles): string
  raw: (styles?: FloatStyles) => SystemStyleObject
}


export declare const float: FloatPatternFn;
