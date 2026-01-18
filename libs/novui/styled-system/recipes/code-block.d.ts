/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface CodeBlockVariant {
  
}

type CodeBlockVariantMap = {
  [key in keyof CodeBlockVariant]: Array<CodeBlockVariant[key]>
}

export type CodeBlockVariantProps = {
  [key in keyof CodeBlockVariant]?: ConditionalValue<CodeBlockVariant[key]> | undefined
}

export interface CodeBlockRecipe {
  __type: CodeBlockVariantProps
  (props?: CodeBlockVariantProps): Pretty<Record<"root" | "pre" | "code" | "copy", string>>
  raw: (props?: CodeBlockVariantProps) => CodeBlockVariantProps
  variantMap: CodeBlockVariantMap
  variantKeys: Array<keyof CodeBlockVariant>
  splitVariantProps<Props extends CodeBlockVariantProps>(props: Props): [CodeBlockVariantProps, Pretty<DistributiveOmit<Props, keyof CodeBlockVariantProps>>]
  getVariantProps: (props?: CodeBlockVariantProps) => CodeBlockVariantProps
}


export declare const codeBlock: CodeBlockRecipe