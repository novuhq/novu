import { createElement, forwardRef } from 'react'

import { splitProps } from '../helpers.js';
import { getBleedStyle } from '../patterns/bleed.js';
import { styled } from './factory.js';

export const Bleed = /* @__PURE__ */ forwardRef(function Bleed(props, ref) {
  const [patternProps, restProps] = splitProps(props, ["inline","block"])

const styleProps = getBleedStyle(patternProps)
const mergedProps = { ref, ...styleProps, ...restProps }

return createElement(styled.div, mergedProps)
  })