import { compact, getSlotCompoundVariant, memo, splitProps } from '../helpers.js';
import { createRecipe } from './create-recipe.js';

const buttonDefaultVariants = {
  "size": "md",
  "variant": "filled",
  "fullWidth": false
}
const buttonCompoundVariants = []

const buttonSlotNames = [
  [
    "root",
    "button__root"
  ],
  [
    "inner",
    "button__inner"
  ],
  [
    "label",
    "button__label"
  ],
  [
    "loader",
    "button__loader"
  ],
  [
    "section",
    "button__section"
  ]
]
const buttonSlotFns = /* @__PURE__ */ buttonSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, buttonDefaultVariants, getSlotCompoundVariant(buttonCompoundVariants, slotName))])

const buttonFn = memo((props = {}) => {
  return Object.fromEntries(buttonSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
})

const buttonVariantKeys = [
  "size",
  "variant",
  "fullWidth"
]
const getVariantProps = (variants) => ({ ...buttonDefaultVariants, ...compact(variants) })

export const button = /* @__PURE__ */ Object.assign(buttonFn, {
  __recipe__: false,
  __name__: 'button',
  raw: (props) => props,
  variantKeys: buttonVariantKeys,
  variantMap: {
  "size": [
    "xs",
    "sm",
    "md",
    "lg"
  ],
  "variant": [
    "filled",
    "outline",
    "transparent"
  ],
  "fullWidth": [
    "false",
    "true"
  ]
},
  splitVariantProps(props) {
    return splitProps(props, buttonVariantKeys)
  },
  getVariantProps
})