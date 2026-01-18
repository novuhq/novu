/* eslint-disable */
import type {  ConditionalValue, Nested  } from './conditions';
import type {  PropertiesFallback  } from './csstype';
import type {  SystemProperties, CssVarProperties  } from './style-props';

type String = string & {}
type Number = number & {}

export type Pretty<T> = { [K in keyof T]: T[K] } & {}

export type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never

export type DistributiveUnion<T, U> = {
  [K in keyof T]: K extends keyof U ? U[K] | T[K] : T[K]
} & DistributiveOmit<U, keyof T>

export type Assign<T, U> = {
  [K in keyof T]: K extends keyof U ? U[K] : T[K]
} & U

/* -----------------------------------------------------------------------------
 * Native css properties
 * -----------------------------------------------------------------------------*/

export type CssProperty = keyof PropertiesFallback

export interface CssProperties extends PropertiesFallback<String | Number>, CssVarProperties {}

export interface CssKeyframes {
  [name: string]: {
    [time: string]: CssProperties
  }
}

/* -----------------------------------------------------------------------------
 * Conditional css properties
 * -----------------------------------------------------------------------------*/

interface GenericProperties {
  [key: string]: ConditionalValue<String | Number | boolean>
}

/* -----------------------------------------------------------------------------
 * Native css props
 * -----------------------------------------------------------------------------*/

export type NestedCssProperties = Nested<CssProperties>

export type SystemStyleObject = Nested<SystemProperties & CssVarProperties>

export interface GlobalStyleObject {
  [selector: string]: SystemStyleObject
}
export interface ExtendableGlobalStyleObject {
  [selector: string]: SystemStyleObject | undefined
  extend?: GlobalStyleObject | undefined
}

type FilterStyleObject<P extends string> = {
  [K in P]?: K extends keyof SystemStyleObject ? SystemStyleObject[K] : unknown
}

export type CompositionStyleObject<Property extends string> = Nested<FilterStyleObject<Property> & CssVarProperties>

/* -----------------------------------------------------------------------------
 * Jsx style props
 * -----------------------------------------------------------------------------*/
interface WithCss {
  css?: SystemStyleObject | SystemStyleObject[]
}

export type JsxStyleProps = SystemStyleObject & WithCss

export interface PatchedHTMLProps {
  htmlWidth?: string | number
  htmlHeight?: string | number
  htmlTranslate?: 'yes' | 'no' | undefined
  htmlContent?: string
}

export type OmittedHTMLProps = 'color' | 'translate' | 'transition' | 'width' | 'height' | 'content'

type WithHTMLProps<T> = DistributiveOmit<T, OmittedHTMLProps> & PatchedHTMLProps

export type JsxHTMLProps<T extends Record<string, any>, P extends Record<string, any> = {}> = Assign<
  WithHTMLProps<T>,
  P
>
