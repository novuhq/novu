import { createElement, forwardRef } from 'react'

import { splitProps } from '../helpers.js';
import { getLinkOverlayStyle } from '../patterns/link-overlay.js';
import { styled } from './factory.js';

export const LinkOverlay = /* @__PURE__ */ forwardRef(function LinkOverlay(props, ref) {
  const [patternProps, restProps] = splitProps(props, [])

const styleProps = getLinkOverlayStyle(patternProps)
const mergedProps = { ref, ...styleProps, ...restProps }

return createElement(styled.a, mergedProps)
  })