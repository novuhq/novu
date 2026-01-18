import { createElement, forwardRef } from 'react'

import { splitProps } from '../helpers.js';
import { getDividerStyle } from '../patterns/divider.js';
import { styled } from './factory.js';

export const Divider = /* @__PURE__ */ forwardRef(function Divider(props, ref) {
  const [patternProps, restProps] = splitProps(props, ["orientation","thickness","color"])

const styleProps = getDividerStyle(patternProps)
const mergedProps = { ref, ...styleProps, ...restProps }

return createElement(styled.div, mergedProps)
  })