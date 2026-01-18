/* eslint-disable */
import type { ConditionalValue } from './conditions';
import type { CssProperties } from './system-types';
import type { Tokens } from '../tokens/index';

export interface UtilityValues {
	zIndex: Tokens["zIndex"];
	top: Tokens["spacing"];
	left: Tokens["spacing"];
	inset: "auto" | Tokens["spacing"];
	insetInline: Tokens["spacing"];
	insetBlock: Tokens["spacing"];
	insetBlockEnd: Tokens["spacing"];
	insetBlockStart: Tokens["spacing"];
	insetInlineEnd: Tokens["spacing"];
	insetInlineStart: Tokens["spacing"];
	right: Tokens["spacing"];
	bottom: Tokens["spacing"];
	float: "start" | "end";
	flexBasis: Tokens["spacing"] | "1/2" | "1/3" | "2/3" | "1/4" | "2/4" | "3/4" | "1/5" | "2/5" | "3/5" | "4/5" | "1/6" | "2/6" | "3/6" | "4/6" | "5/6" | "1/12" | "2/12" | "3/12" | "4/12" | "5/12" | "6/12" | "7/12" | "8/12" | "9/12" | "10/12" | "11/12" | "full";
	flex: "1" | "auto" | "initial" | "none";
	gridTemplateColumns: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12";
	gridTemplateRows: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12";
	gridColumn: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12" | "full";
	gridRow: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12" | "full";
	gridAutoColumns: "min" | "max" | "fr";
	gridAutoRows: "min" | "max" | "fr";
	gap: Tokens["spacing"];
	gridGap: Tokens["spacing"];
	gridRowGap: Tokens["spacing"];
	gridColumnGap: Tokens["spacing"];
	rowGap: Tokens["spacing"];
	columnGap: Tokens["spacing"];
	padding: Tokens["spacing"];
	paddingLeft: Tokens["spacing"];
	paddingRight: Tokens["spacing"];
	paddingTop: Tokens["spacing"];
	paddingBottom: Tokens["spacing"];
	paddingBlock: Tokens["spacing"];
	paddingBlockEnd: Tokens["spacing"];
	paddingBlockStart: Tokens["spacing"];
	paddingInline: Tokens["spacing"];
	paddingInlineEnd: Tokens["spacing"];
	paddingInlineStart: Tokens["spacing"];
	marginLeft: "auto" | Tokens["spacing"];
	marginRight: "auto" | Tokens["spacing"];
	marginTop: "auto" | Tokens["spacing"];
	marginBottom: "auto" | Tokens["spacing"];
	margin: "auto" | Tokens["spacing"];
	marginBlock: "auto" | Tokens["spacing"];
	marginBlockEnd: "auto" | Tokens["spacing"];
	marginBlockStart: "auto" | Tokens["spacing"];
	marginInline: "auto" | Tokens["spacing"];
	marginInlineEnd: "auto" | Tokens["spacing"];
	marginInlineStart: "auto" | Tokens["spacing"];
	spaceX: "auto" | Tokens["spacing"];
	spaceY: "auto" | Tokens["spacing"];
	outlineWidth: Tokens["borderWidths"];
	outlineColor: Tokens["colors"];
	outline: Tokens["borders"];
	outlineOffset: Tokens["spacing"];
	divideX: Tokens["borderWidths"];
	divideY: Tokens["borderWidths"];
	divideColor: Tokens["colors"];
	width: "auto" | Tokens["sizes"] | "1/2" | "1/3" | "2/3" | "1/4" | "2/4" | "3/4" | "1/5" | "2/5" | "3/5" | "4/5" | "1/6" | "2/6" | "3/6" | "4/6" | "5/6" | "1/12" | "2/12" | "3/12" | "4/12" | "5/12" | "6/12" | "7/12" | "8/12" | "9/12" | "10/12" | "11/12" | "screen";
	inlineSize: "auto" | Tokens["sizes"] | "1/2" | "1/3" | "2/3" | "1/4" | "2/4" | "3/4" | "1/5" | "2/5" | "3/5" | "4/5" | "1/6" | "2/6" | "3/6" | "4/6" | "5/6" | "1/12" | "2/12" | "3/12" | "4/12" | "5/12" | "6/12" | "7/12" | "8/12" | "9/12" | "10/12" | "11/12" | "screen";
	minWidth: "auto" | Tokens["sizes"] | "1/2" | "1/3" | "2/3" | "1/4" | "2/4" | "3/4" | "1/5" | "2/5" | "3/5" | "4/5" | "1/6" | "2/6" | "3/6" | "4/6" | "5/6" | "1/12" | "2/12" | "3/12" | "4/12" | "5/12" | "6/12" | "7/12" | "8/12" | "9/12" | "10/12" | "11/12" | "screen";
	minInlineSize: "auto" | Tokens["sizes"] | "1/2" | "1/3" | "2/3" | "1/4" | "2/4" | "3/4" | "1/5" | "2/5" | "3/5" | "4/5" | "1/6" | "2/6" | "3/6" | "4/6" | "5/6" | "1/12" | "2/12" | "3/12" | "4/12" | "5/12" | "6/12" | "7/12" | "8/12" | "9/12" | "10/12" | "11/12" | "screen";
	maxWidth: "auto" | Tokens["sizes"] | "1/2" | "1/3" | "2/3" | "1/4" | "2/4" | "3/4" | "1/5" | "2/5" | "3/5" | "4/5" | "1/6" | "2/6" | "3/6" | "4/6" | "5/6" | "1/12" | "2/12" | "3/12" | "4/12" | "5/12" | "6/12" | "7/12" | "8/12" | "9/12" | "10/12" | "11/12" | "screen";
	maxInlineSize: "auto" | Tokens["sizes"] | "1/2" | "1/3" | "2/3" | "1/4" | "2/4" | "3/4" | "1/5" | "2/5" | "3/5" | "4/5" | "1/6" | "2/6" | "3/6" | "4/6" | "5/6" | "1/12" | "2/12" | "3/12" | "4/12" | "5/12" | "6/12" | "7/12" | "8/12" | "9/12" | "10/12" | "11/12" | "screen";
	height: "auto" | Tokens["sizes"] | "svh" | "lvh" | "dvh" | "screen" | "1/2" | "1/3" | "2/3" | "1/4" | "2/4" | "3/4" | "1/5" | "2/5" | "3/5" | "4/5" | "1/6" | "2/6" | "3/6" | "4/6" | "5/6";
	blockSize: "auto" | Tokens["sizes"] | "svh" | "lvh" | "dvh" | "screen" | "1/2" | "1/3" | "2/3" | "1/4" | "2/4" | "3/4" | "1/5" | "2/5" | "3/5" | "4/5" | "1/6" | "2/6" | "3/6" | "4/6" | "5/6";
	minHeight: "auto" | Tokens["sizes"] | "svh" | "lvh" | "dvh" | "screen" | "1/2" | "1/3" | "2/3" | "1/4" | "2/4" | "3/4" | "1/5" | "2/5" | "3/5" | "4/5" | "1/6" | "2/6" | "3/6" | "4/6" | "5/6";
	minBlockSize: "auto" | Tokens["sizes"] | "svh" | "lvh" | "dvh" | "screen" | "1/2" | "1/3" | "2/3" | "1/4" | "2/4" | "3/4" | "1/5" | "2/5" | "3/5" | "4/5" | "1/6" | "2/6" | "3/6" | "4/6" | "5/6";
	maxHeight: "auto" | Tokens["sizes"] | "svh" | "lvh" | "dvh" | "screen" | "1/2" | "1/3" | "2/3" | "1/4" | "2/4" | "3/4" | "1/5" | "2/5" | "3/5" | "4/5" | "1/6" | "2/6" | "3/6" | "4/6" | "5/6";
	maxBlockSize: "auto" | Tokens["sizes"] | "svh" | "lvh" | "dvh" | "screen" | "1/2" | "1/3" | "2/3" | "1/4" | "2/4" | "3/4" | "1/5" | "2/5" | "3/5" | "4/5" | "1/6" | "2/6" | "3/6" | "4/6" | "5/6";
	color: Tokens["colors"];
	fontFamily: Tokens["fonts"];
	fontSize: Tokens["fontSizes"];
	fontWeight: Tokens["fontWeights"];
	fontSmoothing: "antialiased" | "subpixel-antialiased";
	letterSpacing: Tokens["letterSpacings"];
	lineHeight: Tokens["lineHeights"];
	textDecorationColor: Tokens["colors"];
	textEmphasisColor: Tokens["colors"];
	textIndent: Tokens["spacing"];
	textShadow: Tokens["shadows"];
	textShadowColor: Tokens["colors"];
	textWrap: "wrap" | "balance" | "nowrap";
	truncate: boolean;
	background: Tokens["colors"];
	backgroundColor: Tokens["colors"];
	backgroundGradient: Tokens["gradients"] | "to-t" | "to-tr" | "to-r" | "to-br" | "to-b" | "to-bl" | "to-l" | "to-tl";
	textGradient: Tokens["gradients"] | "to-t" | "to-tr" | "to-r" | "to-br" | "to-b" | "to-bl" | "to-l" | "to-tl";
	gradientFrom: Tokens["colors"];
	gradientTo: Tokens["colors"];
	gradientVia: Tokens["colors"];
	borderRadius: Tokens["radii"];
	borderTopLeftRadius: Tokens["radii"];
	borderTopRightRadius: Tokens["radii"];
	borderBottomRightRadius: Tokens["radii"];
	borderBottomLeftRadius: Tokens["radii"];
	borderTopRadius: Tokens["radii"];
	borderRightRadius: Tokens["radii"];
	borderBottomRadius: Tokens["radii"];
	borderLeftRadius: Tokens["radii"];
	borderStartStartRadius: Tokens["radii"];
	borderStartEndRadius: Tokens["radii"];
	borderStartRadius: Tokens["radii"];
	borderEndStartRadius: Tokens["radii"];
	borderEndEndRadius: Tokens["radii"];
	borderEndRadius: Tokens["radii"];
	border: Tokens["borders"];
	borderWidth: Tokens["borderWidths"];
	borderTopWidth: Tokens["borderWidths"];
	borderLeftWidth: Tokens["borderWidths"];
	borderRightWidth: Tokens["borderWidths"];
	borderBottomWidth: Tokens["borderWidths"];
	borderColor: Tokens["colors"];
	borderInline: Tokens["borders"];
	borderInlineWidth: Tokens["borderWidths"];
	borderInlineColor: Tokens["colors"];
	borderBlock: Tokens["borders"];
	borderBlockWidth: Tokens["borderWidths"];
	borderBlockColor: Tokens["colors"];
	borderLeft: Tokens["borders"];
	borderLeftColor: Tokens["colors"];
	borderInlineStart: Tokens["borders"];
	borderInlineStartWidth: Tokens["borderWidths"];
	borderInlineStartColor: Tokens["colors"];
	borderRight: Tokens["borders"];
	borderRightColor: Tokens["colors"];
	borderInlineEnd: Tokens["borders"];
	borderInlineEndWidth: Tokens["borderWidths"];
	borderInlineEndColor: Tokens["colors"];
	borderTop: Tokens["borders"];
	borderTopColor: Tokens["colors"];
	borderBottom: Tokens["borders"];
	borderBottomColor: Tokens["colors"];
	borderBlockEnd: Tokens["borders"];
	borderBlockEndColor: Tokens["colors"];
	borderBlockStart: Tokens["borders"];
	borderBlockStartColor: Tokens["colors"];
	opacity: Tokens["opacity"];
	boxShadow: Tokens["shadows"];
	boxShadowColor: Tokens["colors"];
	filter: "auto";
	backdropFilter: "auto";
	borderSpacing: Tokens["spacing"] | "auto";
	borderSpacingX: Tokens["spacing"];
	borderSpacingY: Tokens["spacing"];
	transition: "all" | "common" | "background" | "colors" | "opacity" | "shadow" | "transform";
	rotate: "auto" | "auto-3d";
	scale: "auto";
	translate: "auto" | "auto-3d";
	translateX: Tokens["spacing"] | "1/2" | "1/3" | "2/3" | "1/4" | "2/4" | "3/4" | "full" | "-1/2" | "-1/3" | "-2/3" | "-1/4" | "-2/4" | "-3/4" | "-full";
	translateY: Tokens["spacing"] | "1/2" | "1/3" | "2/3" | "1/4" | "2/4" | "3/4" | "full" | "-1/2" | "-1/3" | "-2/3" | "-1/4" | "-2/4" | "-3/4" | "-full";
	translateZ: Tokens["spacing"] | "1/2" | "1/3" | "2/3" | "1/4" | "2/4" | "3/4" | "full" | "-1/2" | "-1/3" | "-2/3" | "-1/4" | "-2/4" | "-3/4" | "-full";
	accentColor: Tokens["colors"];
	caretColor: Tokens["colors"];
	scrollbar: "visible" | "hidden";
	scrollbarColor: Tokens["colors"];
	scrollbarGutter: Tokens["spacing"];
	scrollbarWidth: Tokens["sizes"];
	scrollMargin: Tokens["spacing"];
	scrollMarginLeft: Tokens["spacing"];
	scrollMarginRight: Tokens["spacing"];
	scrollMarginTop: Tokens["spacing"];
	scrollMarginBottom: Tokens["spacing"];
	scrollMarginBlock: Tokens["spacing"];
	scrollMarginBlockEnd: Tokens["spacing"];
	scrollMarginBlockStart: Tokens["spacing"];
	scrollMarginInline: Tokens["spacing"];
	scrollMarginInlineEnd: Tokens["spacing"];
	scrollMarginInlineStart: Tokens["spacing"];
	scrollPadding: Tokens["spacing"];
	scrollPaddingBlock: Tokens["spacing"];
	scrollPaddingBlockStart: Tokens["spacing"];
	scrollPaddingBlockEnd: Tokens["spacing"];
	scrollPaddingInline: Tokens["spacing"];
	scrollPaddingInlineEnd: Tokens["spacing"];
	scrollPaddingInlineStart: Tokens["spacing"];
	scrollPaddingLeft: Tokens["spacing"];
	scrollPaddingRight: Tokens["spacing"];
	scrollPaddingTop: Tokens["spacing"];
	scrollPaddingBottom: Tokens["spacing"];
	scrollSnapType: "none" | "x" | "y" | "both";
	scrollSnapStrictness: "mandatory" | "proximity";
	scrollSnapMargin: Tokens["spacing"];
	scrollSnapMarginTop: Tokens["spacing"];
	scrollSnapMarginBottom: Tokens["spacing"];
	scrollSnapMarginLeft: Tokens["spacing"];
	scrollSnapMarginRight: Tokens["spacing"];
	fill: Tokens["colors"];
	stroke: Tokens["colors"];
	strokeWidth: Tokens["borderWidths"];
	srOnly: boolean;
	debug: boolean;
	colorPalette: "amber" | "amber.10" | "amber.20" | "amber.30" | "amber.40" | "amber.50" | "amber.60" | "amber.70" | "amber.80" | "amber.90" | "amber.100" | "amber.110" | "amber.120" | "blue" | "blue.10" | "blue.20" | "blue.30" | "blue.40" | "blue.50" | "blue.60" | "blue.70" | "blue.80" | "blue.90" | "blue.100" | "blue.110" | "blue.120" | "green" | "green.10" | "green.20" | "green.30" | "green.40" | "green.50" | "green.60" | "green.70" | "green.80" | "green.90" | "green.100" | "green.110" | "green.120" | "mauve" | "mauve.10" | "mauve.20" | "mauve.30" | "mauve.40" | "mauve.50" | "mauve.60" | "mauve.70" | "mauve.80" | "mauve.90" | "mauve.100" | "mauve.110" | "mauve.120" | "red" | "red.10" | "red.20" | "red.30" | "red.40" | "red.50" | "red.60" | "red.70" | "red.80" | "red.90" | "red.100" | "red.110" | "red.120" | "transparent" | "legacy" | "typography" | "typography.text" | "typography.text.feedback" | "button" | "button.text" | "button.icon" | "button.secondary" | "surface" | "icon" | "scrollbar" | "table" | "table.header" | "table.row" | "table.row.surface" | "table.bottom" | "tabs" | "badge" | "status" | "input" | "input.border" | "input.surface" | "select" | "select.option" | "select.option.surface" | "codeBlock" | "variable" | "loader" | "mode" | "mode.cloud" | "mode.local";
	textStyle: "text.main" | "text.secondary" | "text.mono" | "text.strong" | "title.page" | "title.section" | "title.subsection";
}



type WithColorOpacityModifier<T> = T extends string ? `${T}/${string}` : T

type ImportantMark = "!" | "!important"
type WhitespaceImportant = ` ${ImportantMark}`
type Important = ImportantMark | WhitespaceImportant
type WithImportant<T> = T extends string ? `${T}${Important}` & { __important?: true } : T;

/**
 * Only relevant when using `strictTokens` or `strictPropertyValues` in your config.
 * - Allows you to use an escape hatch (e.g. `[123px]`) to use any string as a value.
 * - Allows you to use a color opacity modifier (e.g. `red/300`) with known color values.
 * - Allows you to use an important mark (e.g. `!` or `!important`) in the value.
 *
 * This is useful when you want to use a value that is not defined in the config or want to opt-out of the defaults.
 *
 * @example
 * css({
 *   fontSize: '[123px]', // ⚠️ will not throw even if you haven't defined 123px as a token
 * })
 *
 * @see https://panda-css.com/docs/concepts/writing-styles#stricttokens
 * @see https://panda-css.com/docs/concepts/writing-styles#strictpropertyvalues
 */
export type WithEscapeHatch<T> = T | `[${string}]` | WithColorOpacityModifier<T> | WithImportant<T>

/**
 * Will restrict the value of properties that have predefined values to those values only.
 *
 * @example
 * css({
 *   display: 'abc', // ❌ will throw
 * })
 *
 * @see https://panda-css.com/docs/concepts/writing-styles#strictpropertyvalues
 */
export type OnlyKnown<Key, Value> = Value extends boolean
  ? Value
  : Value extends `${infer _}` ? Value : never