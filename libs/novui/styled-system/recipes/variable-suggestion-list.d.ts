/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface VariableSuggestionListVariant {
  
}

type VariableSuggestionListVariantMap = {
  [key in keyof VariableSuggestionListVariant]: Array<VariableSuggestionListVariant[key]>
}

export type VariableSuggestionListVariantProps = {
  [key in keyof VariableSuggestionListVariant]?: ConditionalValue<VariableSuggestionListVariant[key]> | undefined
}

export interface VariableSuggestionListRecipe {
  __type: VariableSuggestionListVariantProps
  (props?: VariableSuggestionListVariantProps): Pretty<Record<"option" | "options" | "dropdown", string>>
  raw: (props?: VariableSuggestionListVariantProps) => VariableSuggestionListVariantProps
  variantMap: VariableSuggestionListVariantMap
  variantKeys: Array<keyof VariableSuggestionListVariant>
  splitVariantProps<Props extends VariableSuggestionListVariantProps>(props: Props): [VariableSuggestionListVariantProps, Pretty<DistributiveOmit<Props, keyof VariableSuggestionListVariantProps>>]
  getVariantProps: (props?: VariableSuggestionListVariantProps) => VariableSuggestionListVariantProps
}


export declare const variableSuggestionList: VariableSuggestionListRecipe