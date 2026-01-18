import { compact, getSlotCompoundVariant, memo, splitProps } from '../helpers.js';
import { createRecipe } from './create-recipe.js';

const jsonSchemaFormSectionDefaultVariants = {
  "depth": "even"
}
const jsonSchemaFormSectionCompoundVariants = []

const jsonSchemaFormSectionSlotNames = [
  [
    "sectionRoot",
    "jsonSchemaFormSection__sectionRoot"
  ],
  [
    "sectionTitle",
    "jsonSchemaFormSection__sectionTitle"
  ]
]
const jsonSchemaFormSectionSlotFns = /* @__PURE__ */ jsonSchemaFormSectionSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, jsonSchemaFormSectionDefaultVariants, getSlotCompoundVariant(jsonSchemaFormSectionCompoundVariants, slotName))])

const jsonSchemaFormSectionFn = memo((props = {}) => {
  return Object.fromEntries(jsonSchemaFormSectionSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
})

const jsonSchemaFormSectionVariantKeys = [
  "depth"
]
const getVariantProps = (variants) => ({ ...jsonSchemaFormSectionDefaultVariants, ...compact(variants) })

export const jsonSchemaFormSection = /* @__PURE__ */ Object.assign(jsonSchemaFormSectionFn, {
  __recipe__: false,
  __name__: 'jsonSchemaFormSection',
  raw: (props) => props,
  variantKeys: jsonSchemaFormSectionVariantKeys,
  variantMap: {
  "depth": [
    "even",
    "odd"
  ]
},
  splitVariantProps(props) {
    return splitProps(props, jsonSchemaFormSectionVariantKeys)
  },
  getVariantProps
})