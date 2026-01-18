import { compact, getSlotCompoundVariant, memo, splitProps } from '../helpers.js';
import { createRecipe } from './create-recipe.js';

const codeBlockDefaultVariants = {}
const codeBlockCompoundVariants = []

const codeBlockSlotNames = [
  [
    "root",
    "code-block__root"
  ],
  [
    "pre",
    "code-block__pre"
  ],
  [
    "code",
    "code-block__code"
  ],
  [
    "copy",
    "code-block__copy"
  ]
]
const codeBlockSlotFns = /* @__PURE__ */ codeBlockSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, codeBlockDefaultVariants, getSlotCompoundVariant(codeBlockCompoundVariants, slotName))])

const codeBlockFn = memo((props = {}) => {
  return Object.fromEntries(codeBlockSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
})

const codeBlockVariantKeys = []
const getVariantProps = (variants) => ({ ...codeBlockDefaultVariants, ...compact(variants) })

export const codeBlock = /* @__PURE__ */ Object.assign(codeBlockFn, {
  __recipe__: false,
  __name__: 'codeBlock',
  raw: (props) => props,
  variantKeys: codeBlockVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, codeBlockVariantKeys)
  },
  getVariantProps
})