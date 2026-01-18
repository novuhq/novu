/* eslint-disable */
import type { SystemStyleObject, ConditionalValue } from '../types/index';
import type { Properties } from '../types/csstype';
import type { SystemProperties } from '../types/style-props';
import type { DistributiveOmit } from '../types/system-types';
import type { Tokens } from '../tokens/index';

export interface LinkOverlayProperties {
   
}


interface LinkOverlayStyles extends LinkOverlayProperties, DistributiveOmit<SystemStyleObject, keyof LinkOverlayProperties > {}

interface LinkOverlayPatternFn {
  (styles?: LinkOverlayStyles): string
  raw: (styles?: LinkOverlayStyles) => SystemStyleObject
}


export declare const linkOverlay: LinkOverlayPatternFn;
