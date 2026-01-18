import { getPatternStyles, patternFns } from '../helpers.js';
import { css } from '../css/index.js';

const wrapConfig = {
transform(props) {
  const { columnGap, rowGap, gap = columnGap || rowGap ? void 0 : "10px", align, justify, ...rest } = props;
  return {
    display: "flex",
    flexWrap: "wrap",
    alignItems: align,
    justifyContent: justify,
    gap,
    columnGap,
    rowGap,
    ...rest
  };
}}

export const getWrapStyle = (styles = {}) => {
  const _styles = getPatternStyles(wrapConfig, styles)
  return wrapConfig.transform(_styles, patternFns)
}

export const wrap = (styles) => css(getWrapStyle(styles))
wrap.raw = getWrapStyle