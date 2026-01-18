/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface LoadingOverlayVariant {
  
}

type LoadingOverlayVariantMap = {
  [key in keyof LoadingOverlayVariant]: Array<LoadingOverlayVariant[key]>
}

export type LoadingOverlayVariantProps = {
  [key in keyof LoadingOverlayVariant]?: ConditionalValue<LoadingOverlayVariant[key]> | undefined
}

export interface LoadingOverlayRecipe {
  __type: LoadingOverlayVariantProps
  (props?: LoadingOverlayVariantProps): Pretty<Record<"root" | "overlay" | "loader", string>>
  raw: (props?: LoadingOverlayVariantProps) => LoadingOverlayVariantProps
  variantMap: LoadingOverlayVariantMap
  variantKeys: Array<keyof LoadingOverlayVariant>
  splitVariantProps<Props extends LoadingOverlayVariantProps>(props: Props): [LoadingOverlayVariantProps, Pretty<DistributiveOmit<Props, keyof LoadingOverlayVariantProps>>]
  getVariantProps: (props?: LoadingOverlayVariantProps) => LoadingOverlayVariantProps
}


export declare const loadingOverlay: LoadingOverlayRecipe