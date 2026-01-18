/* eslint-disable */
import type { SystemStyleObject, ConditionalValue } from '../types/index';
import type { Properties } from '../types/csstype';
import type { SystemProperties } from '../types/style-props';
import type { DistributiveOmit } from '../types/system-types';
import type { Tokens } from '../tokens/index';

export interface AspectRatioProperties {
   ratio?: ConditionalValue<number>
}


interface AspectRatioStyles extends AspectRatioProperties, DistributiveOmit<SystemStyleObject, keyof AspectRatioProperties | 'aspectRatio'> {}

interface AspectRatioPatternFn {
  (styles?: AspectRatioStyles): string
  raw: (styles?: AspectRatioStyles) => SystemStyleObject
}


export declare const aspectRatio: AspectRatioPatternFn;
