import { createElement, forwardRef } from 'react'

import { splitProps } from '../helpers.js';
import { getGridItemStyle } from '../patterns/grid-item.js';
import { styled } from './factory.js';

export const GridItem = /* @__PURE__ */ forwardRef(function GridItem(props, ref) {
  const [patternProps, restProps] = splitProps(props, ["colSpan","rowSpan","colStart","rowStart","colEnd","rowEnd"])

const styleProps = getGridItemStyle(patternProps)
const mergedProps = { ref, ...styleProps, ...restProps }

return createElement(styled.div, mergedProps)
  })