import { createElement, forwardRef } from 'react'

import { splitProps } from '../helpers.js';
import { getSquareStyle } from '../patterns/square.js';
import { styled } from './factory.js';

export const Square = /* @__PURE__ */ forwardRef(function Square(props, ref) {
  const [patternProps, restProps] = splitProps(props, ["size"])

const styleProps = getSquareStyle(patternProps)
const mergedProps = { ref, ...styleProps, ...restProps }

return createElement(styled.div, mergedProps)
  })