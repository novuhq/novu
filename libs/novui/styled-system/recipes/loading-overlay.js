import { compact, getSlotCompoundVariant, memo, splitProps } from '../helpers.js';
import { createRecipe } from './create-recipe.js';

const loadingOverlayDefaultVariants = {}
const loadingOverlayCompoundVariants = []

const loadingOverlaySlotNames = [
  [
    "root",
    "loadingOverlay__root"
  ],
  [
    "overlay",
    "loadingOverlay__overlay"
  ],
  [
    "loader",
    "loadingOverlay__loader"
  ]
]
const loadingOverlaySlotFns = /* @__PURE__ */ loadingOverlaySlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, loadingOverlayDefaultVariants, getSlotCompoundVariant(loadingOverlayCompoundVariants, slotName))])

const loadingOverlayFn = memo((props = {}) => {
  return Object.fromEntries(loadingOverlaySlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
})

const loadingOverlayVariantKeys = []
const getVariantProps = (variants) => ({ ...loadingOverlayDefaultVariants, ...compact(variants) })

export const loadingOverlay = /* @__PURE__ */ Object.assign(loadingOverlayFn, {
  __recipe__: false,
  __name__: 'loadingOverlay',
  raw: (props) => props,
  variantKeys: loadingOverlayVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, loadingOverlayVariantKeys)
  },
  getVariantProps
})