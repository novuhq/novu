/* eslint-disable */
import type { SystemStyleObject, ConditionalValue } from '../types/index';
import type { Properties } from '../types/csstype';
import type { SystemProperties } from '../types/style-props';
import type { DistributiveOmit } from '../types/system-types';
import type { Tokens } from '../tokens/index';

export interface VisuallyHiddenProperties {
   
}


interface VisuallyHiddenStyles extends VisuallyHiddenProperties, DistributiveOmit<SystemStyleObject, keyof VisuallyHiddenProperties > {}

interface VisuallyHiddenPatternFn {
  (styles?: VisuallyHiddenStyles): string
  raw: (styles?: VisuallyHiddenStyles) => SystemStyleObject
}


export declare const visuallyHidden: VisuallyHiddenPatternFn;
