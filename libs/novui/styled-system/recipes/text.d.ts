/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface TextVariant {
  /**
 * @default "main"
 */
variant: "main" | "secondary" | "mono" | "strong"
}

type TextVariantMap = {
  [key in keyof TextVariant]: Array<TextVariant[key]>
}

export type TextVariantProps = {
  [key in keyof TextVariant]?: ConditionalValue<TextVariant[key]> | undefined
}

export interface TextRecipe {
  __type: TextVariantProps
  (props?: TextVariantProps): string
  raw: (props?: TextVariantProps) => TextVariantProps
  variantMap: TextVariantMap
  variantKeys: Array<keyof TextVariant>
  splitVariantProps<Props extends TextVariantProps>(props: Props): [TextVariantProps, Pretty<DistributiveOmit<Props, keyof TextVariantProps>>]
  getVariantProps: (props?: TextVariantProps) => TextVariantProps
}

/**
 * Styles for text including: body and labels


 */
export declare const text: TextRecipe