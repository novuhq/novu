import { createElement, forwardRef } from 'react'

import { splitProps } from '../helpers.js';
import { getFlexStyle } from '../patterns/flex.js';
import { styled } from './factory.js';

export const Flex = /* @__PURE__ */ forwardRef(function Flex(props, ref) {
  const [patternProps, restProps] = splitProps(props, ["align","justify","direction","wrap","basis","grow","shrink"])

const styleProps = getFlexStyle(patternProps)
const mergedProps = { ref, ...styleProps, ...restProps }

return createElement(styled.div, mergedProps)
  })