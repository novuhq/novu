export function getLinearGradientColorStopValues(str: string) {
  return (
    str
      .trim()
      // strip off left side.
      .split(/^(?:-\w+-)*linear-gradient\((?:.*?(top|bottom|left|right|deg)\s*,\s*)*/)[2]
      // strip off right side.
      .replace(/\s*\)\s*;*$/, '')
      // strip any whitespace (sequence) before and after each comma.
      .replace(/\s*,\s*/g, ',')
      // split color-stop values at each comma which is followed by a non digit character.
      .split(/,(?=\D)/)
      // prettify/normalize each color stop value for better readability.
      .map((item) => item.split(' ')[0])
  );
}
