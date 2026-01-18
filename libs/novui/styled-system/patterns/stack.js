import { getPatternStyles, patternFns } from '../helpers.js';
import { css } from '../css/index.js';

const stackConfig = {
transform(props) {
  const { align, justify, direction, gap, ...rest } = props;
  return {
    display: "flex",
    flexDirection: direction,
    alignItems: align,
    justifyContent: justify,
    gap,
    ...rest
  };
},
defaultValues:{direction:'column',gap:'10px'}}

export const getStackStyle = (styles = {}) => {
  const _styles = getPatternStyles(stackConfig, styles)
  return stackConfig.transform(_styles, patternFns)
}

export const stack = (styles) => css(getStackStyle(styles))
stack.raw = getStackStyle