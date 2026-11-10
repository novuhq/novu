import type { BaseFormatConverter, Root } from 'chat';

declare const inboundMarkdownParserBrand: unique symbol;

export type InboundMarkdownParser = ((text: string) => Root) & {
  readonly [inboundMarkdownParserBrand]: true;
};

type ChatMarkdownModule = {
  parseMarkdown: (markdown: string) => Root;
  stringifyMarkdown?: (ast: Root) => string;
  BaseFormatConverter?: typeof BaseFormatConverter;
};

function asInboundParser(parse: (text: string) => Root): InboundMarkdownParser {
  return parse as InboundMarkdownParser;
}

export function createInboundMarkdownParser(chat: ChatMarkdownModule): InboundMarkdownParser {
  const Base = chat.BaseFormatConverter;
  const parseIncoming = typeof Base === 'function' ? Base.prototype?.parseIncoming : undefined;

  if (typeof Base !== 'function' || typeof parseIncoming !== 'function') {
    return asInboundParser(chat.parseMarkdown);
  }

  const stringifyMarkdown = chat.stringifyMarkdown;
  if (typeof stringifyMarkdown !== 'function') {
    return asInboundParser(chat.parseMarkdown);
  }

  const parseMarkdown = chat.parseMarkdown;
  const stringify = stringifyMarkdown;

  class InboundMarkdownConverter extends Base {
    override toAst(text: string): Root {
      return parseMarkdown(text);
    }

    override fromAst(ast: Root): string {
      return stringify(ast);
    }
  }

  const converter = new InboundMarkdownConverter();

  return asInboundParser((text: string) => converter.parseIncoming(text).formatted);
}
