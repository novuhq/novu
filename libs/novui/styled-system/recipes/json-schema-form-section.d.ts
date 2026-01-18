/* eslint-disable */
import type { ConditionalValue } from '../types/index';
import type { DistributiveOmit, Pretty } from '../types/system-types';

interface JsonSchemaFormSectionVariant {
  /**
 * @default "even"
 */
depth: "even" | "odd"
}

type JsonSchemaFormSectionVariantMap = {
  [key in keyof JsonSchemaFormSectionVariant]: Array<JsonSchemaFormSectionVariant[key]>
}

export type JsonSchemaFormSectionVariantProps = {
  [key in keyof JsonSchemaFormSectionVariant]?: ConditionalValue<JsonSchemaFormSectionVariant[key]> | undefined
}

export interface JsonSchemaFormSectionRecipe {
  __type: JsonSchemaFormSectionVariantProps
  (props?: JsonSchemaFormSectionVariantProps): Pretty<Record<"sectionRoot" | "sectionTitle", string>>
  raw: (props?: JsonSchemaFormSectionVariantProps) => JsonSchemaFormSectionVariantProps
  variantMap: JsonSchemaFormSectionVariantMap
  variantKeys: Array<keyof JsonSchemaFormSectionVariant>
  splitVariantProps<Props extends JsonSchemaFormSectionVariantProps>(props: Props): [JsonSchemaFormSectionVariantProps, Pretty<DistributiveOmit<Props, keyof JsonSchemaFormSectionVariantProps>>]
  getVariantProps: (props?: JsonSchemaFormSectionVariantProps) => JsonSchemaFormSectionVariantProps
}


export declare const jsonSchemaFormSection: JsonSchemaFormSectionRecipe