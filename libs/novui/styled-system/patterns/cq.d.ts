/* eslint-disable */
import type { SystemStyleObject, ConditionalValue } from '../types/index';
import type { Properties } from '../types/csstype';
import type { SystemProperties } from '../types/style-props';
import type { DistributiveOmit } from '../types/system-types';
import type { Tokens } from '../tokens/index';

export interface CqProperties {
   name?: ConditionalValue<Tokens["containerNames"] | Properties["containerName"]>
	type?: SystemProperties["containerType"]
}


interface CqStyles extends CqProperties, DistributiveOmit<SystemStyleObject, keyof CqProperties > {}

interface CqPatternFn {
  (styles?: CqStyles): string
  raw: (styles?: CqStyles) => SystemStyleObject
}


export declare const cq: CqPatternFn;
