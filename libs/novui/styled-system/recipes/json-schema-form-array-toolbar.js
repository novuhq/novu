import { compact, getSlotCompoundVariant, memo, splitProps } from '../helpers.js';
import { createRecipe } from './create-recipe.js';

const jsonSchemaFormArrayToolbarDefaultVariants = {}
const jsonSchemaFormArrayToolbarCompoundVariants = []

const jsonSchemaFormArrayToolbarSlotNames = [
  [
    "toolbar",
    "jsonSchemaFormArrayToolbar__toolbar"
  ],
  [
    "toolbarWrapper",
    "jsonSchemaFormArrayToolbar__toolbarWrapper"
  ]
]
const jsonSchemaFormArrayToolbarSlotFns = /* @__PURE__ */ jsonSchemaFormArrayToolbarSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, jsonSchemaFormArrayToolbarDefaultVariants, getSlotCompoundVariant(jsonSchemaFormArrayToolbarCompoundVariants, slotName))])

const jsonSchemaFormArrayToolbarFn = memo((props = {}) => {
  return Object.fromEntries(jsonSchemaFormArrayToolbarSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
})

const jsonSchemaFormArrayToolbarVariantKeys = [
  "itemType"
]
const getVariantProps = (variants) => ({ ...jsonSchemaFormArrayToolbarDefaultVariants, ...compact(variants) })

export const jsonSchemaFormArrayToolbar = /* @__PURE__ */ Object.assign(jsonSchemaFormArrayToolbarFn, {
  __recipe__: false,
  __name__: 'jsonSchemaFormArrayToolbar',
  raw: (props) => props,
  variantKeys: jsonSchemaFormArrayToolbarVariantKeys,
  variantMap: {
  "itemType": [
    "boolean",
    "string",
    "number",
    "integer",
    "object",
    "array",
    "null"
  ]
},
  splitVariantProps(props) {
    return splitProps(props, jsonSchemaFormArrayToolbarVariantKeys)
  },
  getVariantProps
})