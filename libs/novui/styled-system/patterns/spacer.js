import { getPatternStyles, patternFns } from '../helpers.js';
import { css } from '../css/index.js';

const spacerConfig = {
transform(props, { map }) {
  const { size, ...rest } = props;
  return {
    alignSelf: "stretch",
    justifySelf: "stretch",
    flex: map(size, (v) => v == null ? "1" : `0 0 ${v}`),
    ...rest
  };
}}

export const getSpacerStyle = (styles = {}) => {
  const _styles = getPatternStyles(spacerConfig, styles)
  return spacerConfig.transform(_styles, patternFns)
}

export const spacer = (styles) => css(getSpacerStyle(styles))
spacer.raw = getSpacerStyle