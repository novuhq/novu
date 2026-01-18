import { memo, splitProps } from '../helpers.js';
import { createRecipe, mergeRecipes } from './create-recipe.js';

const titleFn = /* @__PURE__ */ createRecipe('title', {
  "variant": "page"
}, [])

const titleVariantMap = {
  "variant": [
    "page",
    "section",
    "subsection"
  ]
}

const titleVariantKeys = Object.keys(titleVariantMap)

export const title = /* @__PURE__ */ Object.assign(memo(titleFn.recipeFn), {
  __recipe__: true,
  __name__: 'title',
  __getCompoundVariantCss__: titleFn.__getCompoundVariantCss__,
  raw: (props) => props,
  variantKeys: titleVariantKeys,
  variantMap: titleVariantMap,
  merge(recipe) {
    return mergeRecipes(this, recipe)
  },
  splitVariantProps(props) {
    return splitProps(props, titleVariantKeys)
  },
  getVariantProps: titleFn.getVariantProps,
})