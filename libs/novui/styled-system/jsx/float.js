import { createElement, forwardRef } from 'react'

import { splitProps } from '../helpers.js';
import { getFloatStyle } from '../patterns/float.js';
import { styled } from './factory.js';

export const Float = /* @__PURE__ */ forwardRef(function Float(props, ref) {
  const [patternProps, restProps] = splitProps(props, ["offsetX","offsetY","offset","placement"])

const styleProps = getFloatStyle(patternProps)
const mergedProps = { ref, ...styleProps, ...restProps }

return createElement(styled.div, mergedProps)
  })