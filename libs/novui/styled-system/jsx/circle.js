import { createElement, forwardRef } from 'react'

import { splitProps } from '../helpers.js';
import { getCircleStyle } from '../patterns/circle.js';
import { styled } from './factory.js';

export const Circle = /* @__PURE__ */ forwardRef(function Circle(props, ref) {
  const [patternProps, restProps] = splitProps(props, ["size"])

const styleProps = getCircleStyle(patternProps)
const mergedProps = { ref, ...styleProps, ...restProps }

return createElement(styled.div, mergedProps)
  })