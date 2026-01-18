/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface InputEditorWidgetVariant {
  
}

type InputEditorWidgetVariantMap = {
  [key in keyof InputEditorWidgetVariant]: Array<InputEditorWidgetVariant[key]>
}

export type InputEditorWidgetVariantProps = {
  [key in keyof InputEditorWidgetVariant]?: ConditionalValue<InputEditorWidgetVariant[key]> | undefined
}

export interface InputEditorWidgetRecipe {
  __type: InputEditorWidgetVariantProps
  (props?: InputEditorWidgetVariantProps): Pretty<Record<"linkEditorSave" | "linkEditorDropdown" | "root" | "content" | "typographyStylesProvider" | "control" | "controlsGroup" | "toolbar" | "linkEditor" | "linkEditorInput" | "linkEditorExternalControl", string>>
  raw: (props?: InputEditorWidgetVariantProps) => InputEditorWidgetVariantProps
  variantMap: InputEditorWidgetVariantMap
  variantKeys: Array<keyof InputEditorWidgetVariant>
  splitVariantProps<Props extends InputEditorWidgetVariantProps>(props: Props): [InputEditorWidgetVariantProps, Pretty<DistributiveOmit<Props, keyof InputEditorWidgetVariantProps>>]
  getVariantProps: (props?: InputEditorWidgetVariantProps) => InputEditorWidgetVariantProps
}


export declare const inputEditorWidget: InputEditorWidgetRecipe