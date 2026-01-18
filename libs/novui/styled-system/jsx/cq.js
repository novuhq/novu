import { createElement, forwardRef } from 'react'

import { splitProps } from '../helpers.js';
import { getCqStyle } from '../patterns/cq.js';
import { styled } from './factory.js';

export const Cq = /* @__PURE__ */ forwardRef(function Cq(props, ref) {
  const [patternProps, restProps] = splitProps(props, ["name","type"])

const styleProps = getCqStyle(patternProps)
const mergedProps = { ref, ...styleProps, ...restProps }

return createElement(styled.div, mergedProps)
  })