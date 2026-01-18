import { getPatternStyles, patternFns } from '../helpers.js';
import { css } from '../css/index.js';

const boxConfig = {
transform(props) {
  return props;
}}

export const getBoxStyle = (styles = {}) => {
  const _styles = getPatternStyles(boxConfig, styles)
  return boxConfig.transform(_styles, patternFns)
}

export const box = (styles) => css(getBoxStyle(styles))
box.raw = getBoxStyle