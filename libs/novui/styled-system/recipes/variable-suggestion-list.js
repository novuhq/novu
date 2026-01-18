import { compact, getSlotCompoundVariant, memo, splitProps } from '../helpers.js';
import { createRecipe } from './create-recipe.js';

const variableSuggestionListDefaultVariants = {}
const variableSuggestionListCompoundVariants = []

const variableSuggestionListSlotNames = [
  [
    "option",
    "variableSuggestionList__option"
  ],
  [
    "options",
    "variableSuggestionList__options"
  ],
  [
    "dropdown",
    "variableSuggestionList__dropdown"
  ]
]
const variableSuggestionListSlotFns = /* @__PURE__ */ variableSuggestionListSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, variableSuggestionListDefaultVariants, getSlotCompoundVariant(variableSuggestionListCompoundVariants, slotName))])

const variableSuggestionListFn = memo((props = {}) => {
  return Object.fromEntries(variableSuggestionListSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
})

const variableSuggestionListVariantKeys = []
const getVariantProps = (variants) => ({ ...variableSuggestionListDefaultVariants, ...compact(variants) })

export const variableSuggestionList = /* @__PURE__ */ Object.assign(variableSuggestionListFn, {
  __recipe__: false,
  __name__: 'variableSuggestionList',
  raw: (props) => props,
  variantKeys: variableSuggestionListVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, variableSuggestionListVariantKeys)
  },
  getVariantProps
})