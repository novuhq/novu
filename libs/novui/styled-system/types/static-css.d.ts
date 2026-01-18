/* eslint-disable */
interface WithConditions {
  /**
   * The css conditions to generate for the rule.
   * @example ['hover', 'focus']
   */
  conditions?: string[]
  responsive?: boolean
}

export interface CssRule extends WithConditions {
  /**
   * The css properties to generate utilities for.
   * @example ['margin', 'padding']
   */
  properties: {
    [property: string]: Array<string | number>
  }
}

interface RecipeRuleVariants {
  [variant: string]: boolean | string[]
}

export type RecipeRule = '*' | (RecipeRuleVariants & WithConditions)
export type PatternRule = '*' | CssRule

export interface StaticCssOptions {
  /**
   * The css utility classes to generate.
   */
  css?: CssRule[]
  /**
   * The css recipes to generate.
   */
  recipes?:
    | '*'
    | {
        [recipe: string]: RecipeRule[]
      }
  /**
   * The css patterns to generate.
   */
  patterns?: {
    [pattern: string]: PatternRule[]
  }
  /**
   * The CSS themes to generate
   */
  themes?: string[]
}
