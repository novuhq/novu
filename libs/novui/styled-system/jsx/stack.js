import { createElement, forwardRef } from 'react'

import { splitProps } from '../helpers.js';
import { getStackStyle } from '../patterns/stack.js';
import { styled } from './factory.js';

export const Stack = /* @__PURE__ */ forwardRef(function Stack(props, ref) {
  const [patternProps, restProps] = splitProps(props, ["align","justify","direction","gap"])

const styleProps = getStackStyle(patternProps)
const mergedProps = { ref, ...styleProps, ...restProps }

return createElement(styled.div, mergedProps)
  })