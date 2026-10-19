import { Box, Text } from 'ink';
import { marked, type Tokens } from 'marked';
import React from 'react';
import { CodeBlock } from './code-block';
import { MarkdownTable } from './table';

interface MarkdownProps {
  source: string;
  width: number;
}

export function Markdown({ source, width }: MarkdownProps): React.ReactElement {
  const tokens = React.useMemo(() => {
    try {
      return marked.lexer(source);
    } catch {
      return [];
    }
  }, [source]);

  return (
    <Box flexDirection="column" width={width}>
      {tokens.map((token, index) => (
        <BlockToken token={token} key={`b-${index}`} width={width} />
      ))}
    </Box>
  );
}

interface BlockTokenProps {
  token: Tokens.Generic;
  width: number;
}

function BlockToken({ token, width }: BlockTokenProps): React.ReactElement | null {
  switch (token.type) {
    case 'space':
      return <Text> </Text>;
    case 'heading': {
      const heading = token as Tokens.Heading;
      const color = heading.depth === 1 ? 'cyan' : heading.depth === 2 ? 'yellow' : 'magenta';

      return (
        <Box marginTop={1}>
          <Text bold color={color}>
            {renderInline(heading.tokens ?? [textToken(heading.text)])}
          </Text>
        </Box>
      );
    }
    case 'paragraph': {
      const paragraph = token as Tokens.Paragraph;

      return (
        <Box marginTop={1}>
          <Text>{renderInline(paragraph.tokens ?? [textToken(paragraph.text)])}</Text>
        </Box>
      );
    }
    case 'blockquote': {
      const blockquote = token as Tokens.Blockquote;

      return (
        <Box marginTop={1} flexDirection="row">
          <Text dimColor>{'\u2502 '}</Text>
          <Box flexDirection="column">
            {(blockquote.tokens ?? []).map((child, idx) => (
              <BlockToken token={child} key={`bq-${idx}`} width={Math.max(20, width - 2)} />
            ))}
          </Box>
        </Box>
      );
    }
    case 'code': {
      const code = token as Tokens.Code;

      return (
        <Box marginTop={1} flexDirection="column">
          <CodeBlock code={code.text} language={code.lang} width={width} />
        </Box>
      );
    }
    case 'list': {
      const list = token as Tokens.List;

      return (
        <Box marginTop={1} flexDirection="column">
          {list.items.map((item, idx) => {
            const startNumber = typeof list.start === 'number' ? list.start : 1;
            const marker = list.ordered ? `${startNumber + idx}.` : '\u2022';

            return (
              <Box key={`li-${idx}`} flexDirection="row">
                <Text color="gray">{`${marker} `}</Text>
                <Box flexDirection="column" flexGrow={1}>
                  {renderListItem(item, width)}
                </Box>
              </Box>
            );
          })}
        </Box>
      );
    }
    case 'hr':
      return (
        <Box marginTop={1}>
          <Text dimColor>{'\u2500'.repeat(Math.max(8, width - 2))}</Text>
        </Box>
      );
    case 'table': {
      const table = token as Tokens.Table;
      const header = table.header.map((cell) => stripFormatting(cell.text ?? ''));
      const rows = table.rows.map((row) => row.map((cell) => stripFormatting(cell.text ?? '')));

      return (
        <Box marginTop={1}>
          <MarkdownTable header={header} rows={rows} width={width} />
        </Box>
      );
    }
    case 'html': {
      const html = token as Tokens.HTML;

      return (
        <Box marginTop={1}>
          <Text dimColor>{html.text.trim()}</Text>
        </Box>
      );
    }
    default: {
      const text = (token as { text?: string }).text;
      if (!text) return null;

      return (
        <Box marginTop={1}>
          <Text>{text}</Text>
        </Box>
      );
    }
  }
}

function renderListItem(item: Tokens.ListItem, width: number): React.ReactElement[] {
  const tokens = item.tokens ?? [];

  return tokens.map((tok, idx) => {
    if (tok.type === 'text') {
      const child = tok as Tokens.Text & { tokens?: Tokens.Generic[] };
      const inline = child.tokens ?? [textToken(child.text)];

      return <Text key={`lit-${idx}`}>{renderInline(inline)}</Text>;
    }

    return <BlockToken token={tok} key={`lib-${idx}`} width={width} />;
  });
}

function renderInline(tokens: Tokens.Generic[]): React.ReactNode {
  return tokens.map((token, idx) => <InlineToken token={token} key={`i-${idx}`} />);
}

interface InlineTokenProps {
  token: Tokens.Generic;
}

function InlineToken({ token }: InlineTokenProps): React.ReactElement | null {
  switch (token.type) {
    case 'text': {
      const text = (token as Tokens.Text).text ?? '';

      return <Text>{decodeEntities(text)}</Text>;
    }
    case 'strong': {
      const strong = token as Tokens.Strong;

      return <Text bold>{renderInline(strong.tokens ?? [textToken(strong.text)])}</Text>;
    }
    case 'em': {
      const em = token as Tokens.Em;

      return <Text italic>{renderInline(em.tokens ?? [textToken(em.text)])}</Text>;
    }
    case 'codespan': {
      const code = token as Tokens.Codespan;

      return <Text color="green">{`\`${decodeEntities(code.text)}\``}</Text>;
    }
    case 'link': {
      const link = token as Tokens.Link;
      const inner = renderInline(link.tokens ?? [textToken(link.text)]);

      return (
        <Text color="blue" underline>
          {wrapHyperlink(link.href, inner)}
        </Text>
      );
    }
    case 'br':
      return <Text>{'\n'}</Text>;
    case 'del': {
      const del = token as Tokens.Del;

      return <Text strikethrough>{renderInline(del.tokens ?? [textToken(del.text)])}</Text>;
    }
    default: {
      const text = (token as { text?: string }).text;
      if (!text) return null;

      return <Text>{decodeEntities(text)}</Text>;
    }
  }
}

function wrapHyperlink(url: string, children: React.ReactNode): React.ReactNode {
  const supportsHyperlinks =
    process.env.TERM_PROGRAM === 'iTerm.app' ||
    process.env.TERM_PROGRAM === 'WezTerm' ||
    process.env.TERM_PROGRAM === 'vscode';
  if (!supportsHyperlinks) return children;
  const open = `\x1b]8;;${url}\x1b\\`;
  const close = `\x1b]8;;\x1b\\`;

  return (
    <>
      <Text>{open}</Text>
      {children}
      <Text>{close}</Text>
    </>
  );
}

function stripFormatting(value: string): string {
  return value
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .trim();
}

function textToken(text: string): Tokens.Generic {
  return { type: 'text', raw: text, text } as unknown as Tokens.Generic;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
