import { getPatternStyles, patternFns } from '../helpers.js';
import { css } from '../css/index.js';

const hstackConfig = {
transform(props) {
  const { justify, gap, ...rest } = props;
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: justify,
    gap,
    flexDirection: "row",
    ...rest
  };
},
defaultValues:{gap:'10px'}}

export const getHstackStyle = (styles = {}) => {
  const _styles = getPatternStyles(hstackConfig, styles)
  return hstackConfig.transform(_styles, patternFns)
}

export const hstack = (styles) => css(getHstackStyle(styles))
hstack.raw = getHstackStyle