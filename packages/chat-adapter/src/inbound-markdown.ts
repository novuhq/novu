import type { BaseFormatConverter, Root } from 'chat';

/**
 * Parses untrusted inbound markdown into a `Message.formatted` tree. Text over the
 * Chat SDK's inbound budget becomes one paragraph of `fallbackText` (default: the
 * markdown itself), so a hostile message can't stall the event loop in the parser.
 *
 * `@novu/chat-adapter-web-chat` and `@novu/chat-adapter-email` keep their own
 * smaller copy, because those packages can't depend on this one.
 */
export type InboundMarkdownParser = (markdown: string, fallbackText?: string) => Root;

type ChatMarkdownModule = {
  BaseFormatConverter: typeof BaseFormatConverter;
  parseMarkdown: (markdown: string) => Root;
  stringifyMarkdown: (ast: Root) => string;
};

export function createInboundMarkdownParser(chat: ChatMarkdownModule): InboundMarkdownParser {
  class InboundMarkdownConverter extends chat.BaseFormatConverter {
    private readonly fallbackText: string | undefined;

    constructor(fallbackText: string | undefined) {
      super();
      this.fallbackText = fallbackText;
    }

    override toAst(markdown: string): Root {
      return chat.parseMarkdown(markdown);
    }

    override fromAst(ast: Root): string {
      return chat.stringifyMarkdown(ast);
    }

    protected override incomingFallbackText(markdown: string): string {
      return this.fallbackText ?? markdown;
    }
  }

  return (markdown, fallbackText) => new InboundMarkdownConverter(fallbackText).parseIncoming(markdown).formatted;
}
