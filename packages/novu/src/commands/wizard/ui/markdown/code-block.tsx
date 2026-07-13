import { highlight, supportsLanguage } from 'cli-highlight';
import { Box, Text } from 'ink';
import React from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
  width: number;
}

export function CodeBlock({ code, language, width }: CodeBlockProps): React.ReactElement {
  const lang = normalizeLanguage(language);
  let rendered = code.replace(/\s+$/g, '');
  try {
    if (lang && supportsLanguage(lang)) {
      rendered = highlight(rendered, { language: lang, ignoreIllegals: true });
    } else {
      rendered = highlight(rendered, { language: 'plaintext', ignoreIllegals: true });
    }
  } catch {
    /* noop — fall back to plain text */
  }

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1} width={Math.max(20, width)}>
      {lang ? (
        <Box justifyContent="flex-end" marginBottom={0}>
          <Text dimColor>{lang}</Text>
        </Box>
      ) : null}
      <Text>{rendered}</Text>
    </Box>
  );
}

function normalizeLanguage(language?: string): string | undefined {
  if (!language) return undefined;
  const lower = language.toLowerCase().trim();
  const aliases: Record<string, string> = {
    sh: 'bash',
    shell: 'bash',
    zsh: 'bash',
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    yml: 'yaml',
  };

  return aliases[lower] ?? lower;
}
