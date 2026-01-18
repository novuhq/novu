/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface TitleVariant {
  /**
 * @default "page"
 */
variant: "page" | "section" | "subsection"
}

type TitleVariantMap = {
  [key in keyof TitleVariant]: Array<TitleVariant[key]>
}

export type TitleVariantProps = {
  [key in keyof TitleVariant]?: ConditionalValue<TitleVariant[key]> | undefined
}

export interface TitleRecipe {
  __type: TitleVariantProps
  (props?: TitleVariantProps): string
  raw: (props?: TitleVariantProps) => TitleVariantProps
  variantMap: TitleVariantMap
  variantKeys: Array<keyof TitleVariant>
  splitVariantProps<Props extends TitleVariantProps>(props: Props): [TitleVariantProps, Pretty<DistributiveOmit<Props, keyof TitleVariantProps>>]
  getVariantProps: (props?: TitleVariantProps) => TitleVariantProps
}

/**
 * Styles for title including: body and labels


 */
export declare const title: TitleRecipe