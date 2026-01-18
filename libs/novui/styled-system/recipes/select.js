import { compact, getSlotCompoundVariant, memo, splitProps } from '../helpers.js';
import { createRecipe } from './create-recipe.js';

const selectDefaultVariants = {}
const selectCompoundVariants = []

const selectSlotNames = [
  [
    "root",
    "select__root"
  ],
  [
    "input",
    "select__input"
  ],
  [
    "wrapper",
    "select__wrapper"
  ],
  [
    "section",
    "select__section"
  ],
  [
    "description",
    "select__description"
  ],
  [
    "error",
    "select__error"
  ],
  [
    "required",
    "select__required"
  ],
  [
    "label",
    "select__label"
  ],
  [
    "dropdown",
    "select__dropdown"
  ],
  [
    "empty",
    "select__empty"
  ],
  [
    "group",
    "select__group"
  ],
  [
    "groupLabel",
    "select__groupLabel"
  ],
  [
    "option",
    "select__option"
  ],
  [
    "options",
    "select__options"
  ]
]
const selectSlotFns = /* @__PURE__ */ selectSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, selectDefaultVariants, getSlotCompoundVariant(selectCompoundVariants, slotName))])

const selectFn = memo((props = {}) => {
  return Object.fromEntries(selectSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
})

const selectVariantKeys = []
const getVariantProps = (variants) => ({ ...selectDefaultVariants, ...compact(variants) })

export const select = /* @__PURE__ */ Object.assign(selectFn, {
  __recipe__: false,
  __name__: 'select',
  raw: (props) => props,
  variantKeys: selectVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, selectVariantKeys)
  },
  getVariantProps
})