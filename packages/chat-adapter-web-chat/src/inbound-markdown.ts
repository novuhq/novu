import type { BaseFormatConverter, Root } from 'chat';

/**
 * Parses untrusted inbound markdown into a `Message.formatted` tree. Text over the
 * Chat SDK's inbound budget becomes one paragraph of the original text, so a hostile
 * message can't stall the event loop in the parser.
 *
 * Same file in `@novu/chat-adapter-web-chat` and `@novu/chat-adapter-email`; keep
 * them identical. `@novu/chat-sdk-adapter` has its own variant.
 */
export type InboundMarkdownParser = (markdown: string) => Root;

type ChatMarkdownModule = {
  BaseFormatConverter: typeof BaseFormatConverter;
  parseMarkdown: (markdown: string) => Root;
  stringifyMarkdown: (ast: Root) => string;
};

export function createInboundMarkdownParser(chat: ChatMarkdownModule): InboundMarkdownParser {
  class InboundMarkdownConverter extends chat.BaseFormatConverter {
    override toAst(markdown: string): Root {
      return chat.parseMarkdown(markdown);
    }

    override fromAst(ast: Root): string {
      return chat.stringifyMarkdown(ast);
    }
  }

  const converter = new InboundMarkdownConverter();

  return (markdown) => converter.parseIncoming(markdown).formatted;
}
