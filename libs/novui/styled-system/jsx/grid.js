import { createElement, forwardRef } from 'react'

import { splitProps } from '../helpers.js';
import { getGridStyle } from '../patterns/grid.js';
import { styled } from './factory.js';

export const Grid = /* @__PURE__ */ forwardRef(function Grid(props, ref) {
  const [patternProps, restProps] = splitProps(props, ["gap","columnGap","rowGap","columns","minChildWidth"])

const styleProps = getGridStyle(patternProps)
const mergedProps = { ref, ...styleProps, ...restProps }

return createElement(styled.div, mergedProps)
  })