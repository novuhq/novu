/* eslint-disable */
import type { SystemStyleObject, ConditionalValue } from '../types/index';
import type { Properties } from '../types/csstype';
import type { SystemProperties } from '../types/style-props';
import type { DistributiveOmit } from '../types/system-types';
import type { Tokens } from '../tokens/index';

export interface GridItemProperties {
   colSpan?: ConditionalValue<number>
	rowSpan?: ConditionalValue<number>
	colStart?: ConditionalValue<number>
	rowStart?: ConditionalValue<number>
	colEnd?: ConditionalValue<number>
	rowEnd?: ConditionalValue<number>
}


interface GridItemStyles extends GridItemProperties, DistributiveOmit<SystemStyleObject, keyof GridItemProperties > {}

interface GridItemPatternFn {
  (styles?: GridItemStyles): string
  raw: (styles?: GridItemStyles) => SystemStyleObject
}


export declare const gridItem: GridItemPatternFn;
