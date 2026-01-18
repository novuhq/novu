import { getPatternStyles, patternFns } from '../helpers.js';
import { css } from '../css/index.js';

const containerConfig = {
transform(props) {
  return {
    position: "relative",
    maxWidth: "8xl",
    mx: "auto",
    px: { base: "4", md: "6", lg: "8" },
    ...props
  };
}}

export const getContainerStyle = (styles = {}) => {
  const _styles = getPatternStyles(containerConfig, styles)
  return containerConfig.transform(_styles, patternFns)
}

export const container = (styles) => css(getContainerStyle(styles))
container.raw = getContainerStyle