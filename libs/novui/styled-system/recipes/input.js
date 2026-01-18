import { compact, getSlotCompoundVariant, memo, splitProps } from '../helpers.js';
import { createRecipe } from './create-recipe.js';

const inputDefaultVariants = {}
const inputCompoundVariants = []

const inputSlotNames = [
  [
    "root",
    "input__root"
  ],
  [
    "input",
    "input__input"
  ],
  [
    "wrapper",
    "input__wrapper"
  ],
  [
    "section",
    "input__section"
  ],
  [
    "description",
    "input__description"
  ],
  [
    "error",
    "input__error"
  ],
  [
    "required",
    "input__required"
  ],
  [
    "label",
    "input__label"
  ]
]
const inputSlotFns = /* @__PURE__ */ inputSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, inputDefaultVariants, getSlotCompoundVariant(inputCompoundVariants, slotName))])

const inputFn = memo((props = {}) => {
  return Object.fromEntries(inputSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
})

const inputVariantKeys = [
  "variant"
]
const getVariantProps = (variants) => ({ ...inputDefaultVariants, ...compact(variants) })

export const input = /* @__PURE__ */ Object.assign(inputFn, {
  __recipe__: false,
  __name__: 'input',
  raw: (props) => props,
  variantKeys: inputVariantKeys,
  variantMap: {
  "variant": [
    "preventLayoutShift"
  ]
},
  splitVariantProps(props) {
    return splitProps(props, inputVariantKeys)
  },
  getVariantProps
})