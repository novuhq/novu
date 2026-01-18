/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface JsonSchemaFormArrayToolbarVariant {
  itemType: "boolean" | "string" | "number" | "integer" | "object" | "array" | "null"
}

type JsonSchemaFormArrayToolbarVariantMap = {
  [key in keyof JsonSchemaFormArrayToolbarVariant]: Array<JsonSchemaFormArrayToolbarVariant[key]>
}

export type JsonSchemaFormArrayToolbarVariantProps = {
  [key in keyof JsonSchemaFormArrayToolbarVariant]?: ConditionalValue<JsonSchemaFormArrayToolbarVariant[key]> | undefined
}

export interface JsonSchemaFormArrayToolbarRecipe {
  __type: JsonSchemaFormArrayToolbarVariantProps
  (props?: JsonSchemaFormArrayToolbarVariantProps): Pretty<Record<"toolbar" | "toolbarWrapper", string>>
  raw: (props?: JsonSchemaFormArrayToolbarVariantProps) => JsonSchemaFormArrayToolbarVariantProps
  variantMap: JsonSchemaFormArrayToolbarVariantMap
  variantKeys: Array<keyof JsonSchemaFormArrayToolbarVariant>
  splitVariantProps<Props extends JsonSchemaFormArrayToolbarVariantProps>(props: Props): [JsonSchemaFormArrayToolbarVariantProps, Pretty<DistributiveOmit<Props, keyof JsonSchemaFormArrayToolbarVariantProps>>]
  getVariantProps: (props?: JsonSchemaFormArrayToolbarVariantProps) => JsonSchemaFormArrayToolbarVariantProps
}


export declare const jsonSchemaFormArrayToolbar: JsonSchemaFormArrayToolbarRecipe