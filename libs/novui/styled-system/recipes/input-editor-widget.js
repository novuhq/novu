import { compact, getSlotCompoundVariant, memo, splitProps } from '../helpers.js';
import { createRecipe } from './create-recipe.js';

const inputEditorWidgetDefaultVariants = {}
const inputEditorWidgetCompoundVariants = []

const inputEditorWidgetSlotNames = [
  [
    "linkEditorSave",
    "inputEditorWidget__linkEditorSave"
  ],
  [
    "linkEditorDropdown",
    "inputEditorWidget__linkEditorDropdown"
  ],
  [
    "root",
    "inputEditorWidget__root"
  ],
  [
    "content",
    "inputEditorWidget__content"
  ],
  [
    "typographyStylesProvider",
    "inputEditorWidget__typographyStylesProvider"
  ],
  [
    "control",
    "inputEditorWidget__control"
  ],
  [
    "controlsGroup",
    "inputEditorWidget__controlsGroup"
  ],
  [
    "toolbar",
    "inputEditorWidget__toolbar"
  ],
  [
    "linkEditor",
    "inputEditorWidget__linkEditor"
  ],
  [
    "linkEditorInput",
    "inputEditorWidget__linkEditorInput"
  ],
  [
    "linkEditorExternalControl",
    "inputEditorWidget__linkEditorExternalControl"
  ]
]
const inputEditorWidgetSlotFns = /* @__PURE__ */ inputEditorWidgetSlotNames.map(([slotName, slotKey]) => [slotName, createRecipe(slotKey, inputEditorWidgetDefaultVariants, getSlotCompoundVariant(inputEditorWidgetCompoundVariants, slotName))])

const inputEditorWidgetFn = memo((props = {}) => {
  return Object.fromEntries(inputEditorWidgetSlotFns.map(([slotName, slotFn]) => [slotName, slotFn.recipeFn(props)]))
})

const inputEditorWidgetVariantKeys = []
const getVariantProps = (variants) => ({ ...inputEditorWidgetDefaultVariants, ...compact(variants) })

export const inputEditorWidget = /* @__PURE__ */ Object.assign(inputEditorWidgetFn, {
  __recipe__: false,
  __name__: 'inputEditorWidget',
  raw: (props) => props,
  variantKeys: inputEditorWidgetVariantKeys,
  variantMap: {},
  splitVariantProps(props) {
    return splitProps(props, inputEditorWidgetVariantKeys)
  },
  getVariantProps
})