/* eslint-disable */
import type { SystemStyleObject, ConditionalValue } from '../types/index';
import type { Properties } from '../types/csstype';
import type { SystemProperties } from '../types/style-props';
import type { DistributiveOmit } from '../types/system-types';
import type { Tokens } from '../tokens/index';

export interface SpacerProperties {
   size?: ConditionalValue<Tokens["spacing"]>
}


interface SpacerStyles extends SpacerProperties, DistributiveOmit<SystemStyleObject, keyof SpacerProperties > {}

interface SpacerPatternFn {
  (styles?: SpacerStyles): string
  raw: (styles?: SpacerStyles) => SystemStyleObject
}


export declare const spacer: SpacerPatternFn;
