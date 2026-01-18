import { createElement, forwardRef } from 'react'

import { splitProps } from '../helpers.js';
import { getSpacerStyle } from '../patterns/spacer.js';
import { styled } from './factory.js';

export const Spacer = /* @__PURE__ */ forwardRef(function Spacer(props, ref) {
  const [patternProps, restProps] = splitProps(props, ["size"])

const styleProps = getSpacerStyle(patternProps)
const mergedProps = { ref, ...styleProps, ...restProps }

return createElement(styled.div, mergedProps)
  })