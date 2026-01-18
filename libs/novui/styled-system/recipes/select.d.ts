/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface SelectVariant {
  
}

type SelectVariantMap = {
  [key in keyof SelectVariant]: Array<SelectVariant[key]>
}

export type SelectVariantProps = {
  [key in keyof SelectVariant]?: ConditionalValue<SelectVariant[key]> | undefined
}

export interface SelectRecipe {
  __type: SelectVariantProps
  (props?: SelectVariantProps): Pretty<Record<"root" | "input" | "wrapper" | "section" | "description" | "error" | "required" | "label" | "dropdown" | "empty" | "group" | "groupLabel" | "option" | "options", string>>
  raw: (props?: SelectVariantProps) => SelectVariantProps
  variantMap: SelectVariantMap
  variantKeys: Array<keyof SelectVariant>
  splitVariantProps<Props extends SelectVariantProps>(props: Props): [SelectVariantProps, Pretty<DistributiveOmit<Props, keyof SelectVariantProps>>]
  getVariantProps: (props?: SelectVariantProps) => SelectVariantProps
}


export declare const select: SelectRecipe