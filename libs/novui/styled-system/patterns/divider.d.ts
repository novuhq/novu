/* eslint-disable */
import type { SystemStyleObject, ConditionalValue } from '../types/index';
import type { Properties } from '../types/csstype';
import type { SystemProperties } from '../types/style-props';
import type { DistributiveOmit } from '../types/system-types';
import type { Tokens } from '../tokens/index';

export interface DividerProperties {
   orientation?: ConditionalValue<"horizontal" | "vertical">
	thickness?: ConditionalValue<Tokens["sizes"] | Properties["borderWidth"]>
	color?: ConditionalValue<Tokens["colors"] | Properties["borderColor"]>
}


interface DividerStyles extends DividerProperties, DistributiveOmit<SystemStyleObject, keyof DividerProperties > {}

interface DividerPatternFn {
  (styles?: DividerStyles): string
  raw: (styles?: DividerStyles) => SystemStyleObject
}


export declare const divider: DividerPatternFn;
