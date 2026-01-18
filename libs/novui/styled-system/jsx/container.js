import { createElement, forwardRef } from 'react'

import { splitProps } from '../helpers.js';
import { getContainerStyle } from '../patterns/container.js';
import { styled } from './factory.js';

export const Container = /* @__PURE__ */ forwardRef(function Container(props, ref) {
  const [patternProps, restProps] = splitProps(props, [])

const styleProps = getContainerStyle(patternProps)
const mergedProps = { ref, ...styleProps, ...restProps }

return createElement(styled.div, mergedProps)
  })