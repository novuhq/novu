import { createElement, forwardRef } from 'react'

import { splitProps } from '../helpers.js';
import { getCenterStyle } from '../patterns/center.js';
import { styled } from './factory.js';

export const Center = /* @__PURE__ */ forwardRef(function Center(props, ref) {
  const [patternProps, restProps] = splitProps(props, ["inline"])

const styleProps = getCenterStyle(patternProps)
const mergedProps = { ref, ...styleProps, ...restProps }

return createElement(styled.div, mergedProps)
  })