/* cspell:ignore uderline */
/**
 * biome-ignore-all lint/correctness/noUnusedPrivateClassMembers: used
 * biome-ignore-all lint/correctness/useUniqueElementIds: safe to use
 * biome-ignore-all lint/security/noDangerouslySetInnerHtml: safe to use
 */
import { deepMerge } from '@antfu/utils';
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  HtmlProps,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components';
import { renderAsync as reactEmailRenderAsync } from '@react-email/render';
import type { JSONContent } from '@tiptap/core';
import juice from 'juice';
import { parse } from 'node-html-parser';
import type { JSX } from 'react';
import { type CSSProperties, Fragment } from 'react';
import type { MetaDescriptors } from './meta';
import { meta } from './meta';
import { generateKey } from './utils';

interface NodeOptions {
  parent?: JSONContent;
  prev?: JSONContent;
  next?: JSONContent;

  payloadValue?: PayloadValue;
}

export interface MarkType {
  [key: string]: any;
  type: string;
  attrs?: Record<string, any> | undefined;
}

const antialiased: CSSProperties = {
  WebkitFontSmoothing: 'antialiased',
  MozOsxFontSmoothing: 'grayscale',
};

const allowedHeadings = ['h1', 'h2', 'h3'] as const;
type AllowedHeadings = (typeof allowedHeadings)[number];

const headings: Record<AllowedHeadings, CSSProperties> = {
  h1: {
    fontSize: '30px',
    fontStyle: 'normal',
    fontWeight: 600,
    lineHeight: '40px',
  },
  h2: {
    fontSize: '24px',
    fontStyle: 'normal',
    fontWeight: 600,
    lineHeight: '30px',
  },
  h3: {
    fontSize: '18px',
    fontStyle: 'normal',
    fontWeight: 600,
    lineHeight: '26px',
  },
};

const allowedLogoSizes = ['sm', 'md', 'lg'] as const;
type AllowedLogoSizes = (typeof allowedLogoSizes)[number];

const logoSizes: Record<AllowedLogoSizes, string> = {
  sm: '40px',
  md: '48px',
  lg: '64px',
};

export interface ThemeOptions {
  colors?: Partial<{
    heading: string;
    paragraph: string;
    horizontal: string;
    footer: string;
    blockquoteBorder: string;
    codeBackground: string;
    codeText: string;
    linkCardTitle: string;
    linkCardDescription: string;
    linkCardBadgeText: string;
    linkCardBadgeBackground: string;
    linkCardSubTitle: string;
  }>;
  fontSize?: Partial<{
    paragraph: Partial<{
      fontSize: string;
      fontStyle: string;
      fontWeight: number;
      lineHeight: string;
    }>;
    footer: Partial<{
      fontSize: string;
      fontStyle: string;
      fontWeight: number;
      lineHeight: string;
    }>;
  }>;
}

export interface MailyConfig {
  /**
   * The preview text is the snippet of text that is pulled into the inbox
   * preview of an email client, usually right after the subject line.
   *
   * Default: `undefined`
   */
  preview?: string;
  /**
   * The theme object allows you to customize the colors and font sizes of the
   * rendered email.
   *
   * Default:
   * ```js
   * {
   *   colors: {
   *     heading: '#111827',
   *     paragraph: '#374151',
   *     horizontal: '#EAEAEA',
   *     footer: '#64748B',
   *   },
   *   fontSize: {
   *     paragraph: '15px',
   *     footer: {
   *       size: '14px',
   *       lineHeight: '24px',
   *     },
   *   },
   * }
   * ```
   *
   * @example
   * ```js
   * const maily = new Maily(content, {
   *   theme: {
   *     colors: {
   *       heading: '#111827',
   *     },
   *     fontSize: {
   *       footer: {
   *         size: '14px',
   *         lineHeight: '24px',
   *       },
   *     },
   *   },
   * });
   * ```
   */
  theme?: Partial<ThemeOptions>;
}

const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  pretty: false,
  plainText: false,
  noHtmlWrappingTags: false,
};

const DEFAULT_THEME: ThemeOptions = {
  colors: {
    heading: '#111827',
    paragraph: '#374151',
    horizontal: '#EAEAEA',
    footer: '#64748B',
    blockquoteBorder: '#374151',
    codeBackground: '#EFEFEF',
    codeText: '#111827',
    linkCardTitle: '#111827',
    linkCardDescription: '#6B7280',
    linkCardBadgeText: '#111827',
    linkCardBadgeBackground: '#FEF08A',
    linkCardSubTitle: '#6B7280',
  },
  fontSize: {
    paragraph: {
      fontSize: '14px',
      fontStyle: 'normal',
      fontWeight: 500,
      lineHeight: '20px',
    },
    footer: {
      fontSize: '14px',
      fontStyle: 'normal',
      fontWeight: 500,
      lineHeight: '20px',
    },
  },
};

const CODE_FONT_FAMILY = 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
const DEFAULT_MARGIN = 10;
export const DEFAULT_SECTION_BACKGROUND_COLOR = '#ffffff';
export const DEFAULT_SECTION_ALIGN = 'left';
export const DEFAULT_SECTION_BORDER_RADIUS = 6;
export const DEFAULT_SECTION_BORDER_WIDTH = 0;
export const DEFAULT_SECTION_BORDER_COLOR = '#e2e2e2';
export const DEFAULT_SECTION_BORDER_STYLE = 'solid';

export const DEFAULT_SECTION_MARGIN_TOP = 0;
export const DEFAULT_SECTION_MARGIN_RIGHT = 0;
export const DEFAULT_SECTION_MARGIN_BOTTOM = 10;
export const DEFAULT_SECTION_MARGIN_LEFT = 0;

export const DEFAULT_SECTION_PADDING_TOP = 8;
export const DEFAULT_SECTION_PADDING_RIGHT = 8;
export const DEFAULT_SECTION_PADDING_BOTTOM = 8;
export const DEFAULT_SECTION_PADDING_LEFT = 8;

export const DEFAULT_COLUMNS_WIDTH = '100%';
export const DEFAULT_COLUMNS_GAP = 8;

export const DEFAULT_COLUMN_BACKGROUND_COLOR = 'transparent';
export const DEFAULT_COLUMN_BORDER_RADIUS = 0;
export const DEFAULT_COLUMN_BORDER_WIDTH = 0;
export const DEFAULT_COLUMN_BORDER_COLOR = 'transparent';

export const DEFAULT_COLUMN_PADDING_TOP = 0;
export const DEFAULT_COLUMN_PADDING_RIGHT = 0;
export const DEFAULT_COLUMN_PADDING_BOTTOM = 0;
export const DEFAULT_COLUMN_PADDING_LEFT = 0;

export const DEFAULT_INLINE_IMAGE_HEIGHT = 20;
export const DEFAULT_INLINE_IMAGE_WIDTH = 20;

export const LINK_PROTOCOL_REGEX = /https?:\/\//;

export const DEFAULT_META_TAGS: MetaDescriptors = [
  {
    name: 'viewport',
    content: 'width=device-width',
  },
  {
    httpEquiv: 'X-UA-Compatible',
    content: 'IE=edge',
  },
  {
    name: 'x-apple-disable-message-reformatting',
  },
  {
    // http://www.html-5.com/metatags/format-detection-meta-tag.html
    // It will prevent iOS from automatically detecting possible phone numbers in a block of text
    name: 'format-detection',
    content: 'telephone=no,address=no,email=no,date=no,url=no',
  },
  {
    name: 'color-scheme',
    content: 'light',
  },
  {
    name: 'supported-color-schemes',
    content: 'light',
  },
];

export const DEFAULT_HTML_PROPS: HtmlProps = {
  lang: 'en',
  dir: 'ltr',
};

export const DEFAULT_BUTTON_PADDING_TOP = 10;
export const DEFAULT_BUTTON_PADDING_RIGHT = 32;
export const DEFAULT_BUTTON_PADDING_BOTTOM = 10;
export const DEFAULT_BUTTON_PADDING_LEFT = 32;

export interface RenderOptions {
  /**
   * The options object allows you to customize the output of the rendered
   * email.
   * - `pretty` - If `true`, the output will be formatted with indentation and
   *  line breaks.
   * - `plainText` - If `true`, the output will be plain text instead of HTML.
   * This is useful for testing purposes.
   *
   * Default: `pretty` - `false`, `plainText` - `false`
   */
  pretty?: boolean;
  plainText?: boolean;
  /**
   * If `true`, the output will not have any HTML wrapping tags.
   *
   * Default: `false`
   */
  noHtmlWrappingTags?: boolean;
}

export type VariableFormatter = (options: { variable: string; fallback?: string }) => string;
export type VariableValues = Map<string, string>;
export type LinkValues = Map<string, string>;

export type PayloadValue = Record<string, any> | boolean;
export type PayloadValues = Map<string, PayloadValue>;

export class Maily {
  private readonly content: JSONContent;
  private config: MailyConfig = {
    theme: DEFAULT_THEME,
  };

  private variableFormatter: VariableFormatter = ({ variable, fallback }) => {
    return fallback ? `{{${variable},fallback=${fallback}}}` : `{{${variable}}}`;
  };

  private shouldReplaceVariableValues = false;
  private variableValues: VariableValues = new Map();
  private linkValues: LinkValues = new Map();
  private openTrackingPixel: string | undefined;
  private payloadValues: PayloadValues = new Map();
  private marksOrder = ['underline', 'bold', 'italic', 'textStyle', 'link'];
  private meta: MetaDescriptors = DEFAULT_META_TAGS;
  private htmlProps: HtmlProps = DEFAULT_HTML_PROPS;

  constructor(content: JSONContent = { type: 'doc', content: [] }) {
    this.content = content;
  }

  setPreviewText(preview?: string) {
    this.config.preview = preview;
  }

  setTheme(theme: Partial<ThemeOptions>) {
    this.config.theme = deepMerge(this.config.theme || DEFAULT_THEME, theme);
  }

  setVariableFormatter(formatter: VariableFormatter) {
    this.variableFormatter = formatter;
  }

  /**
   * `setVariableValue` will set the variable value.
   * It will also set `shouldReplaceVariableValues` to `true`.
   *
   * @param variable - The variable name
   * @param value - The variable value
   */
  setVariableValue(variable: string, value: string) {
    if (!this.shouldReplaceVariableValues) {
      this.shouldReplaceVariableValues = true;
    }

    this.variableValues.set(variable, value);
  }

  /**
   * `setVariableValues` will set the variable values.
   * It will also set `shouldReplaceVariableValues` to `true`.
   *
   * @param values - The variable values
   *
   * @example
   * ```js
   * const maily = new Maily(content);
   * maily.setVariableValues({
   *  name: 'John Doe',
   *  email: 'john@doe.com',
   * });
   * ```
   */
  setVariableValues(values: Record<string, string>) {
    if (!this.shouldReplaceVariableValues) {
      this.shouldReplaceVariableValues = true;
    }

    Object.entries(values).forEach(([variable, value]) => {
      this.setVariableValue(variable, value);
    });
  }

  setLinkValue(link: string, value: string) {
    this.linkValues.set(link, value);
  }

  setLinkValues(values: Record<string, string>) {
    Object.entries(values).forEach(([link, value]) => {
      this.setLinkValue(link, value);
    });
  }

  setPayloadValue(key: string, value: PayloadValue) {
    if (!this.shouldReplaceVariableValues) {
      this.shouldReplaceVariableValues = true;
    }

    this.payloadValues.set(key, value);
  }

  setPayloadValues(values: Record<string, PayloadValue>) {
    Object.entries(values).forEach(([key, value]) => {
      this.setPayloadValue(key, value);
    });
  }

  /**
   * `setOpenTrackingPixel` will set the open tracking pixel.
   *
   * @param pixel - The open tracking pixel
   */
  setOpenTrackingPixel(pixel?: string) {
    this.openTrackingPixel = pixel;
  }

  /**
   * `setShouldReplaceVariableValues` will determine whether to replace the
   * variable values or not. Otherwise, it will just return the formatted variable.
   *
   * Default: `false`
   */
  setShouldReplaceVariableValues(shouldReplace: boolean) {
    this.shouldReplaceVariableValues = shouldReplace;
  }

  /**
   * `setMetaTags` will add the meta tags.
   *
   * @param meta - The meta tags
   */
  setMetaTags(meta: MetaDescriptors) {
    this.meta.push(...meta);
  }

  /**
   * `setHtmlProps` will set the HTML props.
   *
   * @param props - The HTML props
   */
  setHtmlProps(props: HtmlProps) {
    this.htmlProps = {
      ...this.htmlProps,
      ...props,
    };
  }

  getAllLinks() {
    const nodes = this.content.content || [];
    const links = new Set<string>();

    const isValidLink = (href: string) => {
      return (
        href &&
        this.isValidUrl(href) &&
        !href.startsWith('#') &&
        !href.startsWith('mailto:') &&
        !href.startsWith('tel:') &&
        typeof href === 'string'
      );
    };

    const extractLinksFromNode = (node: JSONContent) => {
      if (node.type === 'button') {
        const originalLink = node.attrs?.url;
        if (isValidLink(originalLink) && originalLink) {
          links.add(originalLink);
        }
      } else if (node.content) {
        node.content.forEach((childNode) => {
          if (childNode.marks) {
            childNode.marks.forEach((mark) => {
              const originalLink = mark.attrs?.href;
              if (mark.type === 'link' && isValidLink(originalLink)) {
                links.add(originalLink);
              }
            });
          }
          if (childNode.content) {
            extractLinksFromNode(childNode);
          }
        });
      }
    };

    nodes.forEach((childNode) => {
      extractLinksFromNode(childNode);
    });

    return links;
  }

  private isValidUrl(href: string) {
    try {
      const _ = new URL(href);
      return true;
    } catch (_err) {
      return false;
    }
  }

  async render({ noHtmlWrappingTags, ...options }: RenderOptions = DEFAULT_RENDER_OPTIONS): Promise<string> {
    const markup = this.markup({ noHtmlWrappingTags });

    return reactEmailRenderAsync(markup, options);
  }

  /**
   * `markup` will render the JSON content into React Email markup.
   * and return the raw React Tree.
   */
  markup({ noHtmlWrappingTags }: Pick<RenderOptions, 'noHtmlWrappingTags'>) {
    const nodes = this.content.content || [];
    const jsxNodes = nodes.map((node, index) => {
      const nodeOptions: NodeOptions = {
        prev: nodes[index - 1],
        next: nodes[index + 1],
        parent: node,
      };

      const component = this.renderNode(node, nodeOptions);
      if (!component) {
        return null;
      }

      return <Fragment key={generateKey()}>{component}</Fragment>;
    });

    const { preview } = this.config;
    const tags = meta(this.meta);
    const htmlProps = this.htmlProps;

    const markup = noHtmlWrappingTags ? (
      <Fragment>
        {preview ? <Preview id="__react-email-preview">{preview}</Preview> : null}
        {jsxNodes}
        {this.openTrackingPixel ? (
          <Img
            alt=""
            src={this.openTrackingPixel}
            style={{
              display: 'none',
              width: '1px',
              height: '1px',
            }}
          />
        ) : null}
      </Fragment>
    ) : (
      <Html {...htmlProps}>
        <Head>
          <style
            dangerouslySetInnerHTML={{
              __html: `blockquote,h1,h2,h3,img,li,ol,p,ul{margin-top:0;margin-bottom:0}@media only screen and (max-width:425px){.tab-row-full{width:100%!important}.tab-col-full{display:block!important;width:100%!important}.tab-pad{padding:0!important}}`,
            }}
          />
          {tags}
        </Head>
        <Body
          style={{
            margin: 0,
          }}
        >
          {preview ? <Preview id="__react-email-preview">{preview}</Preview> : null}
          <Container
            style={{
              maxWidth: '600px',
              minWidth: '300px',
              width: '100%',
              marginLeft: 'auto',
              marginRight: 'auto',
              padding: '1rem',
            }}
          >
            {jsxNodes}
          </Container>
          {this.openTrackingPixel ? (
            <Img
              alt=""
              src={this.openTrackingPixel}
              style={{
                display: 'none',
                width: '1px',
                height: '1px',
              }}
            />
          ) : null}
        </Body>
      </Html>
    );

    return markup;
  }

  private getMarginOverrideConditions(node: JSONContent, options?: NodeOptions) {
    const { parent, prev, next } = options || {};

    const isNextSpacer = next?.type === 'spacer';
    const isPrevSpacer = prev?.type === 'spacer';

    const isParentListItem = parent?.type === 'listItem';

    const isLastSectionElement = parent?.type === 'section' && !next;
    const isFirstSectionElement = parent?.type === 'section' && !prev;

    const isLastColumnElement = parent?.type === 'column' && !next;
    const isFirstColumnElement = parent?.type === 'column' && !prev;

    const isFirstRepeatElement = parent?.type === 'repeat' && !prev;
    const isLastRepeatElement = parent?.type === 'repeat' && !next;

    const isFirstShowElement = parent?.type === 'show' && !prev;
    const isLastShowElement = parent?.type === 'show' && !next;

    const isParentBlockQuote = parent?.type === 'blockquote' && node.type !== 'blockquote';

    return {
      isNextSpacer,
      isPrevSpacer,
      isLastSectionElement,
      isFirstSectionElement,
      isParentListItem,
      isLastColumnElement,
      isFirstColumnElement,
      isFirstRepeatElement,
      isLastRepeatElement,
      isFirstShowElement,
      isLastShowElement,

      shouldRemoveTopMargin:
        isPrevSpacer ||
        isFirstSectionElement ||
        isFirstColumnElement ||
        isFirstRepeatElement ||
        isFirstShowElement ||
        isParentBlockQuote,
      shouldRemoveBottomMargin:
        isNextSpacer ||
        isLastSectionElement ||
        isLastColumnElement ||
        isLastRepeatElement ||
        isLastShowElement ||
        isParentBlockQuote,
    };
  }

  // `getMappedContent` will call corresponding node type
  // and return text content
  private getMappedContent(node: JSONContent, options?: NodeOptions): JSX.Element[] {
    const allNodes = node.content || [];
    return allNodes
      .map((childNode, index) => {
        const component = this.renderNode(childNode, {
          ...options,
          next: allNodes[index + 1],
          prev: allNodes[index - 1],
        });
        if (!component) {
          return null;
        }

        return <Fragment key={generateKey()}>{component}</Fragment>;
      })
      .filter((n) => n !== null) as JSX.Element[];
  }

  // `renderNode` will call the method of the corresponding node type
  private renderNode(node: JSONContent, options: NodeOptions = {}): JSX.Element | null {
    const type = node.type || '';

    if (type in this) {
      // @ts-expect-error - `this` is not assignable to type 'never'
      return this[type]?.(node, options) as JSX.Element;
    }

    throw new Error(`Node type "${type}" is not supported.`);
  }

  // `renderMark` will call the method of the corresponding mark type
  private renderMark(node: JSONContent, _options?: NodeOptions): JSX.Element {
    // It will wrap the text with the corresponding mark type
    const text = node?.text || <>&nbsp;</>;
    const marks = node?.marks || [];
    // sort the marks by uderline, bold, italic, textStyle, link
    // so that the text will be wrapped in the correct order
    marks.sort((a, b) => {
      return this.marksOrder.indexOf(a.type) - this.marksOrder.indexOf(b.type);
    });

    return marks.reduce(
      (acc, mark) => {
        const type = mark.type;
        if (type in this) {
          // @ts-expect-error - `this` is not assignable to type 'never'
          return this[type]?.(mark, acc) as JSX.Element;
        }

        throw new Error(`Mark type "${type}" is not supported.`);
      },
      <>{text}</>
    );
  }

  private paragraph(node: JSONContent, options?: NodeOptions): JSX.Element {
    const { attrs } = node;
    const {
      textAlign = 'left',
      background = 'transparent',
      border = 'none',
      borderRadius = 0,
      paddingTop = 0,
      paddingRight = 0,
      paddingBottom = 0,
      paddingLeft = 0,
      fontSize = this.config.theme?.fontSize?.paragraph?.fontSize,
      fontStyle = this.config.theme?.fontSize?.paragraph?.fontStyle,
      fontWeight = this.config.theme?.fontSize?.paragraph?.fontWeight,
      lineHeight = this.config.theme?.fontSize?.paragraph?.lineHeight,
      color = this.config.theme?.colors?.paragraph,
      display = 'block',
    } = attrs || {};

    const { isParentListItem, shouldRemoveBottomMargin } = this.getMarginOverrideConditions(node, options);

    const show = this.shouldShow(node, options);
    if (!show) {
      return <></>;
    }

    const marginBottom = isParentListItem || shouldRemoveBottomMargin ? 0 : DEFAULT_MARGIN;
    const style: CSSProperties = {
      textAlign,
      ...antialiased,
      display,
      background,
      border,
      borderRadius,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      fontSize,
      fontStyle,
      fontWeight,
      lineHeight,
      color,
      margin: `0 0 ${marginBottom}px 0`,
      // preserves the spacing between the html tags and paragraphs
      overflow: 'hidden',
    };

    if (node.content) {
      return (
        <Text style={style}>
          {this.getMappedContent(node, {
            ...options,
            parent: node,
          })}
        </Text>
      );
    }

    return <Text style={style}>&nbsp;</Text>;
  }

  private text(node: JSONContent, options?: NodeOptions): JSX.Element {
    if (node.marks) {
      return this.renderMark(node, options);
    }

    const text = node.text;
    // if it's all empty, return an invisible space length
    // of the text so that it doesn't look empty for inline-images
    const spaces = text?.match(/\s/g);
    if (spaces && spaces.length === text?.length) {
      return (
        <>
          {spaces.map((_, index) => (
            <Fragment key={index}>&nbsp;</Fragment>
          ))}
        </>
      );
    }

    if (!text) {
      return <>&nbsp;</>;
    }

    const shouldDangerouslySetInnerHTML = node.attrs?.shouldDangerouslySetInnerHTML ?? false;

    // biome-ignore lint/security/noDangerouslySetInnerHtml: safe to use
    return shouldDangerouslySetInnerHTML ? <span dangerouslySetInnerHTML={{ __html: text }} /> : <>{text}</>;
  }

  private bold(_: MarkType, text: JSX.Element): JSX.Element {
    return <strong>{text}</strong>;
  }

  private italic(_: MarkType, text: JSX.Element): JSX.Element {
    return <em>{text}</em>;
  }

  private underline(_: MarkType, text: JSX.Element): JSX.Element {
    return <u>{text}</u>;
  }

  private strike(_: MarkType, text: JSX.Element): JSX.Element {
    return <s style={{ textDecoration: 'line-through' }}>{text}</s>;
  }

  private textStyle(mark: MarkType, text: JSX.Element): JSX.Element {
    const { attrs } = mark;
    const { color = this.config.theme?.colors?.paragraph } = attrs || {};

    return (
      <span
        style={{
          color,
        }}
      >
        {text}
      </span>
    );
  }

  private link(mark: MarkType, text: JSX.Element, options?: NodeOptions): JSX.Element {
    const { attrs } = mark;

    let href = attrs?.href || '#';
    const target = attrs?.target || '_blank';
    const rel = attrs?.rel || 'noopener noreferrer nofollow';
    const isUrlVariable = attrs?.isUrlVariable ?? false;

    if (isUrlVariable) {
      const linkWithoutProtocol = this.removeLinkProtocol(href);
      href = this.variableUrlValue(linkWithoutProtocol, options);
    } else {
      href = this.linkValues.get(href) || href;
    }

    return (
      <Link
        href={href}
        rel={rel}
        style={{
          fontSize: this.config.theme?.fontSize?.paragraph?.fontSize,
          fontStyle: this.config.theme?.fontSize?.paragraph?.fontStyle,
          fontWeight: this.config.theme?.fontSize?.paragraph?.fontWeight,
          lineHeight: this.config.theme?.fontSize?.paragraph?.lineHeight,
          textDecoration: 'underline',
          color: this.config.theme?.colors?.heading,
        }}
        target={target}
      >
        {text}
      </Link>
    );
  }

  private removeLinkProtocol(href: string) {
    return href.replace(LINK_PROTOCOL_REGEX, '');
  }

  private variableUrlValue(href: string, options?: NodeOptions) {
    const { payloadValue } = options || {};
    const linkWithoutProtocol = this.removeLinkProtocol(href);

    return (
      (typeof payloadValue === 'object' ? payloadValue[linkWithoutProtocol] : payloadValue) ??
      this.variableValues.get(linkWithoutProtocol) ??
      href
    );
  }

  private heading(node: JSONContent, options?: NodeOptions): JSX.Element {
    const { attrs } = node;

    const level = `h${Number(attrs?.level) || 1}` as AllowedHeadings;
    const alignment = attrs?.textAlign || 'left';
    const { shouldRemoveBottomMargin } = this.getMarginOverrideConditions(node, options);
    const { fontSize, fontStyle, fontWeight, lineHeight } = headings[level as AllowedHeadings];

    const show = this.shouldShow(node, options);
    if (!show) {
      return <></>;
    }

    return (
      <Heading
        as={level}
        style={{
          textAlign: alignment,
          color: this.config.theme?.colors?.heading,
          fontSize,
          fontStyle,
          lineHeight,
          fontWeight,
        }}
        mb={shouldRemoveBottomMargin ? 0 : DEFAULT_MARGIN}
        mt={0}
        mx={0}
      >
        {this.getMappedContent(node, {
          ...options,
          parent: node,
        })}
      </Heading>
    );
  }

  private variable(node: JSONContent, options?: NodeOptions): JSX.Element {
    const { payloadValue } = options || {};
    const { id: variable, fallback } = node.attrs || {};

    const shouldShow = this.shouldShow(node, options);
    if (!shouldShow || !variable) {
      return <></>;
    }

    const formattedVariable = this.getVariableValue(variable, fallback, options);

    if (node?.marks) {
      return this.renderMark(
        {
          text: formattedVariable,
          marks: node.marks,
        },
        options
      );
    }

    return <>{formattedVariable}</>;
  }

  private getVariableValue(variable: string, fallback?: string, options?: NodeOptions) {
    const { payloadValue } = options || {};

    let formattedVariable = this.variableFormatter({
      variable,
      fallback,
    });

    // If `shouldReplaceVariableValues` is true, replace the variable values
    // Otherwise, just return the formatted variable
    if (this.shouldReplaceVariableValues) {
      formattedVariable =
        (typeof payloadValue === 'object' ? payloadValue[variable] : payloadValue) ??
        this.variableValues.get(variable) ??
        fallback ??
        formattedVariable;
    }

    return formattedVariable;
  }

  private horizontalRule(node: JSONContent, __?: NodeOptions): JSX.Element {
    const { attrs } = node;
    const {
      marginTop = DEFAULT_MARGIN,
      marginRight = 0,
      marginBottom = DEFAULT_MARGIN,
      marginLeft = 0,

      paddingTop = 0,
      paddingRight = 0,
      paddingBottom = 0,
      paddingLeft = 0,
    } = attrs || {};

    return (
      <Hr
        style={{
          marginTop,
          marginRight,
          marginBottom,
          marginLeft,
          paddingTop,
          paddingRight,
          paddingBottom,
          paddingLeft,
        }}
      />
    );
  }

  private orderedList(node: JSONContent, options?: NodeOptions): JSX.Element {
    const { shouldRemoveBottomMargin } = this.getMarginOverrideConditions(node, options);

    return (
      <Container>
        <ol
          style={{
            fontSize: this.config.theme?.fontSize?.paragraph?.fontSize,
            fontStyle: this.config.theme?.fontSize?.paragraph?.fontStyle,
            fontWeight: this.config.theme?.fontSize?.paragraph?.fontWeight,
            lineHeight: this.config.theme?.fontSize?.paragraph?.lineHeight,
            color: this.config.theme?.colors?.paragraph,
            marginTop: '0px',
            marginBottom: shouldRemoveBottomMargin ? '0' : DEFAULT_MARGIN,
            paddingLeft: '26px',
            listStyleType: 'decimal',
          }}
        >
          {this.getMappedContent(node, {
            ...options,
            parent: node,
          })}
        </ol>
      </Container>
    );
  }

  private bulletList(node: JSONContent, options?: NodeOptions): JSX.Element {
    const { parent, next } = options || {};
    const { shouldRemoveBottomMargin } = this.getMarginOverrideConditions(node, {
      parent,
      next,
    });

    return (
      <Container
        style={{
          maxWidth: '100%',
        }}
      >
        <ul
          style={{
            fontSize: this.config.theme?.fontSize?.paragraph?.fontSize,
            fontStyle: this.config.theme?.fontSize?.paragraph?.fontStyle,
            fontWeight: this.config.theme?.fontSize?.paragraph?.fontWeight,
            lineHeight: this.config.theme?.fontSize?.paragraph?.lineHeight,
            color: this.config.theme?.colors?.paragraph,
            marginTop: '0px',
            marginBottom: shouldRemoveBottomMargin ? '0' : DEFAULT_MARGIN,
            paddingLeft: '26px',
            listStyleType: 'disc',
          }}
        >
          {this.getMappedContent(node, {
            ...options,
            parent: node,
          })}
        </ul>
      </Container>
    );
  }

  private listItem(node: JSONContent, options?: NodeOptions): JSX.Element {
    return (
      <li
        style={{
          marginBottom: '8px',
          paddingLeft: '6px',
          ...antialiased,
        }}
      >
        {this.getMappedContent(node, { ...options, parent: node })}
      </li>
    );
  }

  private button(node: JSONContent, options?: NodeOptions): JSX.Element {
    const { attrs } = node;
    let {
      text: _text,
      isTextVariable,
      url,
      isUrlVariable,
      variant,
      buttonColor,
      textColor,
      borderRadius,
      // @TODO: Update the attribute to `textAlign`
      alignment = 'left',

      paddingTop = DEFAULT_BUTTON_PADDING_TOP,
      paddingRight = DEFAULT_BUTTON_PADDING_RIGHT,
      paddingBottom = DEFAULT_BUTTON_PADDING_BOTTOM,
      paddingLeft = DEFAULT_BUTTON_PADDING_LEFT,
      width,
    } = attrs || {};

    const shouldShow = this.shouldShow(node, options);
    if (!shouldShow) {
      return <></>;
    }

    let radius: string | undefined = '0px';
    if (borderRadius === 'round') {
      radius = '9999px';
    } else if (borderRadius === 'smooth') {
      radius = '6px';
    }

    const { shouldRemoveBottomMargin } = this.getMarginOverrideConditions(node, options);

    const href = isUrlVariable ? this.variableUrlValue(url, options) : this.linkValues.get(url) || url;
    const text = isTextVariable ? this.variableUrlValue(_text, options) : _text;

    paddingTop += 2;
    paddingBottom += 2;

    return (
      <Container
        style={{
          textAlign: alignment,
          maxWidth: '100%',
          marginBottom: shouldRemoveBottomMargin ? '0px' : DEFAULT_MARGIN,
        }}
      >
        <Button
          href={href}
          style={{
            color: String(textColor),
            backgroundColor: variant === 'filled' ? String(buttonColor) : 'transparent',
            borderColor: String(buttonColor),
            borderWidth: '2px',
            borderStyle: 'solid',
            textDecoration: 'none',
            boxSizing: 'border-box',
            fontSize: '14px',
            fontWeight: 500,
            borderRadius: radius,
            padding: `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`,
            width,
          }}
        >
          {text}
        </Button>
      </Container>
    );
  }

  private spacer(node: JSONContent, options?: NodeOptions): JSX.Element {
    const { attrs } = node;
    const { height } = attrs || {};

    const shouldShow = this.shouldShow(node, options);
    if (!shouldShow) {
      return <></>;
    }

    return (
      <Container
        style={{
          height: `${height}px`,
        }}
      />
    );
  }

  private hardBreak(_: JSONContent, __?: NodeOptions): JSX.Element {
    return <br />;
  }

  private logo(node: JSONContent, options?: NodeOptions): JSX.Element {
    const { attrs } = node;
    let {
      src,
      isSrcVariable,
      alt,
      title,
      size,
      // @TODO: Update the attribute to `textAlign`
      alignment = 'left',
    } = attrs || {};

    const shouldShow = this.shouldShow(node, options);
    if (!shouldShow) {
      return <></>;
    }

    src = isSrcVariable ? this.variableUrlValue(src, options) : src;

    const { shouldRemoveBottomMargin } = this.getMarginOverrideConditions(node, options);

    return (
      <Row
        style={{
          marginTop: '0px',
          marginBottom: shouldRemoveBottomMargin ? '0px' : DEFAULT_MARGIN,
        }}
      >
        <Column align={alignment}>
          <Img
            alt={alt || title || 'Logo'}
            src={src}
            style={{
              width: logoSizes[size as AllowedLogoSizes] || size,
              height: logoSizes[size as AllowedLogoSizes] || size,
            }}
            title={title || alt || 'Logo'}
          />
        </Column>
      </Row>
    );
  }

  private image(node: JSONContent, options?: NodeOptions): JSX.Element {
    const { attrs } = node;
    let {
      src,
      isSrcVariable,
      alt,
      title,
      width = 'auto',
      height = 'auto',
      alignment = 'center',
      externalLink = '',
      isExternalLinkVariable,
      borderRadius = 0,
    } = attrs || {};

    const shouldShow = this.shouldShow(node, options);
    if (!shouldShow) {
      return <></>;
    }

    const { shouldRemoveBottomMargin } = this.getMarginOverrideConditions(node, options);

    src = isSrcVariable ? this.variableUrlValue(src, options) : src;
    externalLink = isExternalLinkVariable ? this.variableUrlValue(externalLink, options) : externalLink;

    // Handle width value
    const imageWidth = width === 'auto' ? 'auto' : Number(width);
    const widthStyle = imageWidth === 'auto' ? 'auto' : `${imageWidth}px`;

    // Handle height value
    const imageHeight = height === 'auto' ? 'auto' : Number(height);
    const heightStyle = imageHeight === 'auto' ? 'auto' : `${imageHeight}px`;

    const mainImage = (
      <Img
        alt={!src ? 'No image selected' : alt || title || 'Image'}
        src={src}
        style={{
          width: widthStyle, // Use the calculated width
          height: heightStyle, // Use the calculated height
          maxWidth: '100%', // Ensure image doesn't overflow container
          outline: 'none',
          border: 'none',
          textDecoration: 'none',
          display: 'block', // Prevent unwanted spacing
          borderRadius: !src ? '8px' : borderRadius,
          padding: !src ? '8px' : 0,
          fontSize: !src ? '14px' : 'initial',
          lineHeight: !src ? '20px' : 'initial',
          backgroundColor: !src ? '#f4f5f6' : 'initial',
        }}
        title={!src ? 'No image selected' : title || alt || 'Image'}
      />
    );

    return (
      <Row
        style={{
          marginTop: '0px',
          marginBottom: shouldRemoveBottomMargin ? '0px' : DEFAULT_MARGIN,
        }}
      >
        <Column align={alignment}>
          {externalLink ? (
            <a
              href={externalLink}
              rel="noopener noreferrer"
              style={{
                display: 'block',
                maxWidth: '100%',
                textDecoration: 'none',
              }}
              target="_blank"
            >
              {mainImage}
            </a>
          ) : (
            mainImage
          )}
        </Column>
      </Row>
    );
  }

  private footer(node: JSONContent, options?: NodeOptions): JSX.Element {
    const { attrs } = node;
    const { textAlign = 'left' } = attrs || {};

    const { shouldRemoveBottomMargin } = this.getMarginOverrideConditions(node, options);

    return (
      <Text
        style={{
          fontSize: this.config.theme?.fontSize?.footer?.fontSize,
          color: this.config.theme?.colors?.footer,
          marginTop: '0px',
          marginBottom: shouldRemoveBottomMargin ? '0px' : DEFAULT_MARGIN,
          textAlign,
          ...antialiased,
        }}
      >
        {this.getMappedContent(node, {
          ...options,
          parent: node,
        })}
      </Text>
    );
  }

  private blockquote(node: JSONContent, options?: NodeOptions): JSX.Element {
    const { shouldRemoveBottomMargin } = this.getMarginOverrideConditions(node, options);

    return (
      <blockquote
        style={{
          borderLeftWidth: '4px',
          borderLeftStyle: 'solid',
          borderLeftColor: this.config.theme?.colors?.blockquoteBorder,
          paddingLeft: '16px',
          marginLeft: '0px',
          marginRight: '0px',
          marginTop: 0,
          marginBottom: shouldRemoveBottomMargin ? '0px' : DEFAULT_MARGIN,
        }}
      >
        {this.getMappedContent(node, {
          ...options,
          parent: node,
        })}
      </blockquote>
    );
  }

  private code(_: MarkType, text: JSX.Element): JSX.Element {
    return (
      <code
        style={{
          backgroundColor: this.config.theme?.colors?.codeBackground,
          color: this.config.theme?.colors?.codeText,
          padding: '2px 4px',
          borderRadius: '6px',
          fontFamily: CODE_FONT_FAMILY,
          fontWeight: 400,
          letterSpacing: 0,
        }}
      >
        {text}
      </code>
    );
  }

  private linkCard(node: JSONContent, options?: NodeOptions): JSX.Element {
    const { attrs } = node;
    const { shouldRemoveBottomMargin } = this.getMarginOverrideConditions(node, options);

    const { title, description, link, linkTitle, image, badgeText, subTitle } = attrs || {};
    const href = this.linkValues.get(link) || this.variableValues.get(link) || link || '#';

    return (
      <a
        href={href}
        rel="noopener noreferrer"
        style={{
          border: '1px solid #eaeaea',
          borderRadius: '10px',
          textDecoration: 'none',
          color: 'inherit',
          display: 'block',
          marginBottom: shouldRemoveBottomMargin ? '0px' : DEFAULT_MARGIN,
        }}
        target="_blank"
      >
        {image ? (
          <Row
            style={{
              marginBottom: '6px',
            }}
          >
            <Column
              style={{
                width: '100%',
                height: '100%',
              }}
            >
              <Img
                alt={title || 'Link Card'}
                src={image}
                style={{
                  borderRadius: '10px 10px 0 0',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                title={title || 'Link Card'}
              />
            </Column>
          </Row>
        ) : null}

        <Row
          style={{
            padding: '15px',
            marginTop: 0,
            marginBottom: 0,
          }}
        >
          <Column
            style={{
              verticalAlign: 'top',
            }}
          >
            <Row
              align={undefined}
              style={{
                marginBottom: '8px',
                marginTop: '0px',
              }}
              width="auto"
            >
              <Column>
                <Text
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: this.config.theme?.colors?.linkCardTitle,
                    margin: '0px',
                    ...antialiased,
                  }}
                >
                  {title}
                </Text>
              </Column>
              {badgeText || subTitle ? (
                <Column
                  style={{
                    paddingLeft: '6px',
                    verticalAlign: 'middle',
                  }}
                >
                  {badgeText ? (
                    <span
                      style={{
                        fontWeight: 600,
                        color: this.config.theme?.colors?.linkCardBadgeText,
                        padding: '4px 8px',
                        borderRadius: '8px',
                        backgroundColor: this.config.theme?.colors?.linkCardBadgeBackground,
                        fontSize: '12px',
                        lineHeight: '12px',
                      }}
                    >
                      {badgeText}
                    </span>
                  ) : null}{' '}
                  {subTitle && !badgeText ? (
                    <span
                      style={{
                        fontWeight: 'normal',
                        color: this.config.theme?.colors?.linkCardSubTitle,
                        fontSize: '12px',
                        lineHeight: '12px',
                      }}
                    >
                      {subTitle}
                    </span>
                  ) : null}
                </Column>
              ) : null}
            </Row>
            <Text
              style={{
                fontSize: '16px',
                color: this.config.theme?.colors?.linkCardDescription,
                marginTop: '0px',
                marginBottom: '0px',
                ...antialiased,
              }}
            >
              {description}{' '}
              {linkTitle ? (
                <a
                  href={href}
                  rel="noopener noreferrer"
                  style={{
                    color: this.config.theme?.colors?.linkCardTitle,
                    fontSize: '14px',
                    fontWeight: 600,
                    textDecoration: 'underline',
                  }}
                >
                  {linkTitle}
                </a>
              ) : null}
            </Text>
          </Column>
        </Row>
      </a>
    );
  }

  private section(node: JSONContent, options?: NodeOptions): JSX.Element {
    const { attrs } = node;
    const {
      borderRadius = DEFAULT_SECTION_BORDER_RADIUS,
      background,
      backgroundColor = DEFAULT_SECTION_BACKGROUND_COLOR,

      align = DEFAULT_SECTION_ALIGN,
      borderWidth = DEFAULT_SECTION_BORDER_WIDTH,
      borderColor = DEFAULT_SECTION_BORDER_COLOR,
      borderStyle = DEFAULT_SECTION_BORDER_STYLE,

      marginTop = DEFAULT_SECTION_MARGIN_TOP,
      marginRight = DEFAULT_SECTION_MARGIN_RIGHT,
      marginBottom = DEFAULT_SECTION_MARGIN_BOTTOM,
      marginLeft = DEFAULT_SECTION_MARGIN_LEFT,

      paddingTop = DEFAULT_SECTION_PADDING_TOP,
      paddingRight = DEFAULT_SECTION_PADDING_RIGHT,
      paddingBottom = DEFAULT_SECTION_PADDING_BOTTOM,
      paddingLeft = DEFAULT_SECTION_PADDING_LEFT,

      textAlign = 'initial',
    } = attrs || {};

    const { shouldRemoveBottomMargin } = this.getMarginOverrideConditions(node, options);

    const shouldShow = this.shouldShow(node, options);
    if (!shouldShow) {
      return <></>;
    }

    return (
      <Row
        style={{
          marginTop,
          marginRight,
          marginBottom: shouldRemoveBottomMargin ? 0 : marginBottom,
          marginLeft,
        }}
      >
        <Column
          align={align}
          style={{
            borderColor,
            borderWidth,
            borderStyle,

            background,
            backgroundColor,
            borderRadius,

            paddingTop,
            paddingRight,
            paddingBottom,
            paddingLeft,

            textAlign,
          }}
        >
          {this.getMappedContent(node, {
            ...options,
            parent: node,
          })}
        </Column>
      </Row>
    );
  }

  private columns(node: JSONContent, options?: NodeOptions): JSX.Element {
    const { attrs } = node;
    const { marginBottom = DEFAULT_SECTION_MARGIN_BOTTOM } = attrs || {};
    const { shouldRemoveBottomMargin } = this.getMarginOverrideConditions(node, options);
    const shouldShow = this.shouldShow(node, options);
    if (!shouldShow) {
      return <></>;
    }

    const [newNode, totalWidth] = this.adjustColumnsContent(node);

    return (
      <Row
        width={`${totalWidth}%`}
        style={{
          margin: 0,
          marginBottom: shouldRemoveBottomMargin ? 0 : marginBottom,
          padding: 0,
          width: `${totalWidth}%`,
        }}
        className="tab-row-full"
      >
        {this.getMappedContent(newNode, {
          ...options,
          parent: newNode,
        })}
      </Row>
    );
  }

  private adjustColumnsContent(node: JSONContent): [JSONContent, number] {
    const { content = [] } = node;
    const totalWidth = 100;
    const columnsWithWidth = content.filter((c) => c.type === 'column' && Boolean(Number(c.attrs?.width || 0)));
    const autoWidthColumns = content.filter(
      (c) => c.type === 'column' && (c.attrs?.width === 'auto' || !c.attrs?.width)
    );

    const totalWidthUsed = columnsWithWidth.reduce((acc, c) => acc + Number(c.attrs?.width), 0);

    const remainingWidth = totalWidth - totalWidthUsed;
    const measuredWidth = Math.round(remainingWidth / autoWidthColumns.length);

    const columnCount = content.filter((c) => c.type === 'column').length;
    const gap = node.attrs?.gap || DEFAULT_COLUMNS_GAP;

    return [
      {
        ...node,
        content: content.map((c, index) => {
          const isAutoWidthColumn = c.type === 'column' && (c.attrs?.width === 'auto' || !c.attrs?.width);
          const isFirstColumn = index === 0;
          const isMiddleColumn = index > 0 && index < columnCount - 1;
          const isLastColumn = index === content.length - 1;

          let paddingLeft = 0;
          let paddingRight = 0;

          // For 2 columns, apply a simple gap logic
          if (columnCount < 3) {
            paddingLeft = isFirstColumn ? 0 : gap / 2;
            paddingRight = isLastColumn ? 0 : gap / 2;
          } else {
            // For more than 2 columns, apply more gap in the first and last columns
            // and less gap in the middle columns to make it look more balanced
            // because the first and last columns have more space to fill
            const leftAndRightPadding = (gap / 2) * 1.5;
            const middleColumnPadding = leftAndRightPadding / 2;

            paddingLeft = isFirstColumn ? 0 : isMiddleColumn ? middleColumnPadding : leftAndRightPadding;
            paddingRight = isLastColumn ? 0 : isMiddleColumn ? middleColumnPadding : leftAndRightPadding;
          }

          paddingLeft = Math.round(paddingLeft * 100) / 100;
          paddingRight = Math.round(paddingRight * 100) / 100;

          return {
            ...c,
            attrs: {
              ...c.attrs,
              width: isAutoWidthColumn ? measuredWidth : c.attrs?.width,

              isFirstColumn,
              isLastColumn,
              index,

              paddingLeft,
              paddingRight,
            },
          };
        }),
      },
      autoWidthColumns.length === 0 ? Math.min(totalWidth, totalWidthUsed) : totalWidth,
    ];
  }

  private column(node: JSONContent, options?: NodeOptions): JSX.Element {
    const { attrs } = node;
    const { width, verticalAlign = 'top', paddingLeft = 0, paddingRight = 0 } = attrs || {};

    return (
      <Column
        width={`${Number(width)}%`}
        style={{
          width: `${Number(width)}%`,
          margin: 0,
          verticalAlign,
        }}
        className="tab-col-full"
      >
        <Section
          style={{
            margin: 0,
            paddingLeft,
            paddingRight,
          }}
          className="tab-pad"
        >
          {this.getMappedContent(node, {
            ...options,
            parent: node,
          })}
        </Section>
      </Column>
    );
  }

  private repeat(node: JSONContent, options?: NodeOptions): JSX.Element {
    const { attrs } = node;
    const { each = '', iterations = 0 } = attrs || {};

    const shouldShow = this.shouldShow(node, options);
    if (!shouldShow) {
      return <></>;
    }

    let { payloadValue } = options || {};
    payloadValue = typeof payloadValue === 'object' ? payloadValue : {};

    const values = this.payloadValues.get(each) ?? payloadValue[each] ?? [];
    if (!Array.isArray(values)) {
      throw new Error(`Payload value for each "${each}" is not an array`);
    }

    // If iterations is 0 or not set, use all values
    // Otherwise use the specified number of iterations
    const repeatCount = iterations === 0 ? values.length : iterations;
    const repeatedValues = Array.from({ length: repeatCount }, (_, i) => values[i % values.length] || {});

    return (
      <>
        {repeatedValues.map((value) => {
          return (
            <Fragment key={generateKey()}>
              {this.getMappedContent(node, {
                ...options,
                parent: node,
                payloadValue: value,
              })}
            </Fragment>
          );
        })}
      </>
    );
  }

  /**
   * @deprecated
   * This for node is an alias for the repeat node
   * we will remove this in the future
   * @param node
   * @param options
   * @returns JSX.Element
   */
  private for(node: JSONContent, options?: NodeOptions): JSX.Element {
    return this.repeat(node, options);
  }

  private shouldShow(node: JSONContent, options?: NodeOptions): boolean {
    const showIfKey = node?.attrs?.showIfKey ?? '';
    if (!showIfKey) {
      return true;
    }

    let { payloadValue } = options || {};
    payloadValue = typeof payloadValue === 'object' ? payloadValue : {};
    return !!(this.payloadValues.get(showIfKey) ?? payloadValue[showIfKey]);
  }

  htmlCodeBlock(node: JSONContent, options?: NodeOptions): JSX.Element {
    const show = this.shouldShow(node, options);
    if (!show) {
      return <></>;
    }

    // the text can be a proper html code block
    // or only the body of the html
    // so we need to wrap it in a proper html tag
    const text =
      node.content?.reduce((acc, n) => {
        if (n?.type === 'text') {
          return acc + n?.text;
        } else if (n?.type === 'variable') {
          const value = this.getVariableValue(n?.attrs?.id, n?.attrs?.fallback, options);
          return acc + value;
        }

        return acc;
      }, '') || '';

    // we will inline the css in the html
    // so that it can be rendered properly
    const inlineCssHtml = juice(text);
    const doc = parse(inlineCssHtml);
    const head = doc?.querySelector('head');
    head?.remove();
    const html = doc.toString();

    return (
      <table align="left" width="100%" border={0} cellPadding="0" cellSpacing="0" role="presentation">
        <tbody>
          <tr style={{ width: '100%' }}>
            <td
              style={{ width: '100%' }}
              dangerouslySetInnerHTML={{
                __html: html,
              }}
            />
          </tr>
        </tbody>
      </table>
    );
  }

  private inlineImage(node: JSONContent, options?: NodeOptions): JSX.Element {
    const { attrs } = node;
    let {
      src,
      isSrcVariable,
      alt = '',
      title = '',
      height = DEFAULT_INLINE_IMAGE_HEIGHT,
      width = DEFAULT_INLINE_IMAGE_WIDTH,
      externalLink = '',
      isExternalLinkVariable,
    } = attrs || {};

    src = isSrcVariable ? this.variableUrlValue(src, options) : src;
    externalLink = isExternalLinkVariable ? this.variableUrlValue(externalLink, options) : externalLink;

    const image = (
      <img
        src={src}
        alt={alt}
        title={title}
        width={width}
        height={height}
        style={{
          display: 'inline',
          verticalAlign: 'middle',
          width: `${width}px`,
          height: `${height}px`,
          outline: 'none',
          border: 'none',
          textDecoration: 'none',
        }}
      />
    );

    if (!externalLink) {
      return image;
    }

    return (
      <a
        href={externalLink}
        rel="noopener noreferrer"
        style={{
          display: 'inline',
          textDecoration: 'none',
        }}
        target="_blank"
      >
        {image}
      </a>
    );
  }
}
