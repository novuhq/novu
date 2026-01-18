/* eslint-disable */
import type {  CompositionStyleObject  } from './system-types';

interface Token<T> {
  value: T
  description?: string
}

interface Recursive<T> {
  [key: string]: Recursive<T> | T
}

/* -----------------------------------------------------------------------------
 * Text styles
 * -----------------------------------------------------------------------------*/

type TextStyleProperty =
  | 'font'
  | 'fontFamily'
  | 'fontFeatureSettings'
  | 'fontKerning'
  | 'fontLanguageOverride'
  | 'fontOpticalSizing'
  | 'fontPalette'
  | 'fontSize'
  | 'fontSizeAdjust'
  | 'fontStretch'
  | 'fontStyle'
  | 'fontSynthesis'
  | 'fontVariant'
  | 'fontVariantAlternates'
  | 'fontVariantCaps'
  | 'fontVariantLigatures'
  | 'fontVariantNumeric'
  | 'fontVariantPosition'
  | 'fontVariationSettings'
  | 'fontWeight'
  | 'hypens'
  | 'hyphenateCharacter'
  | 'hyphenateLimitChars'
  | 'letterSpacing'
  | 'lineBreak'
  | 'lineHeight'
  | 'quotes'
  | 'overflowWrap'
  | 'textCombineUpright'
  | 'textDecoration'
  | 'textDecorationColor'
  | 'textDecorationLine'
  | 'textDecorationSkipInk'
  | 'textDecorationStyle'
  | 'textDecorationThickness'
  | 'textEmphasis'
  | 'textEmphasisColor'
  | 'textEmphasisPosition'
  | 'textEmphasisStyle'
  | 'textIndent'
  | 'textJustify'
  | 'textOrientation'
  | 'textOverflow'
  | 'textRendering'
  | 'textShadow'
  | 'textTransform'
  | 'textUnderlineOffset'
  | 'textUnderlinePosition'
  | 'textWrap'
  | 'textWrapMode'
  | 'textWrapStyle'
  | 'verticalAlign'
  | 'whiteSpace'
  | 'wordBreak'
  | 'wordSpacing'

export type TextStyle = CompositionStyleObject<TextStyleProperty>

export type TextStyles = Recursive<Token<TextStyle>>

/* -----------------------------------------------------------------------------
 * Layer styles
 * -----------------------------------------------------------------------------*/

type Placement =
  | 'Top'
  | 'Right'
  | 'Bottom'
  | 'Left'
  | 'Inline'
  | 'Block'
  | 'InlineStart'
  | 'InlineEnd'
  | 'BlockStart'
  | 'BlockEnd'

type Radius =
  | `Top${'Right' | 'Left'}`
  | `Bottom${'Right' | 'Left'}`
  | `Start${'Start' | 'End'}`
  | `End${'Start' | 'End'}`

type LayerStyleProperty =
  | 'background'
  | 'backgroundColor'
  | 'backgroundImage'
  | 'borderRadius'
  | 'border'
  | 'borderWidth'
  | 'borderColor'
  | 'borderStyle'
  | 'boxShadow'
  | 'filter'
  | 'backdropFilter'
  | 'transform'
  | 'color'
  | 'opacity'
  | 'backgroundBlendMode'
  | 'backgroundAttachment'
  | 'backgroundClip'
  | 'backgroundOrigin'
  | 'backgroundPosition'
  | 'backgroundRepeat'
  | 'backgroundSize'
  | `border${Placement}`
  | `border${Placement}Width`
  | 'borderRadius'
  | `border${Radius}Radius`
  | `border${Placement}Color`
  | `border${Placement}Style`
  | 'padding'
  | `padding${Placement}`

export type LayerStyle = CompositionStyleObject<LayerStyleProperty>

export type LayerStyles = Recursive<Token<LayerStyle>>

export interface CompositionStyles {
  textStyles: TextStyles
  layerStyles: LayerStyles
}
