/* eslint-disable */
import type { SystemStyleObject, ConditionalValue } from '../types/index';
import type { Properties } from '../types/csstype';
import type { SystemProperties } from '../types/style-props';
import type { DistributiveOmit } from '../types/system-types';
import type { Tokens } from '../tokens/index';

export interface SquareProperties {
   size?: SystemProperties["width"]
}


interface SquareStyles extends SquareProperties, DistributiveOmit<SystemStyleObject, keyof SquareProperties > {}

interface SquarePatternFn {
  (styles?: SquareStyles): string
  raw: (styles?: SquareStyles) => SystemStyleObject
}


export declare const square: SquarePatternFn;
