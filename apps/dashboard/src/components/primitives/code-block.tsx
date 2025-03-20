import { tags as t } from '@lezer/highlight';
import { langs, loadLanguage } from '@uiw/codemirror-extensions-langs';
import { createTheme } from '@uiw/codemirror-themes';
import CodeMirror from '@uiw/react-codemirror';
import { Check, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { RiFileCopyLine } from 'react-icons/ri';
import { cn } from '../../utils/ui';

loadLanguage('tsx');
loadLanguage('json');
loadLanguage('shell');
loadLanguage('typescript');
loadLanguage('php');
loadLanguage('go');
loadLanguage('python');

const languageMap = {
  typescript: langs.typescript,
  tsx: langs.tsx,
  json: langs.json,
  shell: langs.shell,
  php: langs.php,
  go: langs.go,
  python: langs.python,
} as const;

export type Language = keyof typeof languageMap;

const darkTheme = createTheme({
  theme: 'dark',
  settings: {
    background: 'rgba(14, 18, 27, 0.90)',
    foreground: '#EEFFFF',
    caret: '#FFCC00',
    selection: '#80CBC440',
    lineHighlight: '#000000',
    gutterBackground: 'rgba(14, 18, 27, 0.90)',
    gutterForeground: '#545454',
  },
  styles: [
    { tag: t.keyword, color: '#C792EA' },
    { tag: t.operator, color: '#89DDFF' },
    { tag: t.special(t.brace), color: '#89DDFF' },
    { tag: t.propertyName, color: '#FFCB6B' },
    { tag: t.definition(t.propertyName), color: '#82AAFF' },
    { tag: t.string, color: '#C3E88D' },
    { tag: t.comment, color: '#546E7A' },
    { tag: t.variableName, color: '#EEFFFF' },
    { tag: [t.function(t.variableName), t.definition(t.variableName)], color: '#82AAFF' },
    { tag: t.typeName, color: '#F07178' },
    { tag: t.className, color: '#FFCB6B' },
    { tag: t.number, color: '#F78C6C' },
    { tag: t.bool, color: '#F78C6C' },
  ],
});

const lightTheme = createTheme({
  theme: 'light',
  settings: {
    background: 'white',
    foreground: '#24292e',
    caret: '#24292e',
    selection: '#0366d625',
    lineHighlight: '#0366d608',
  },
  styles: [
    { tag: t.keyword, color: '#FF5D00' },
    { tag: t.operator, color: '#FF5D00' },
    { tag: t.special(t.brace), color: '#24292e' },
    { tag: t.propertyName, color: '#FB4BA3' },
    { tag: t.definition(t.propertyName), color: '#24292e' },
    { tag: t.string, color: '#8B41E1' },
    { tag: t.comment, color: '#6e7781' },
    { tag: t.variableName, color: '#24292e' },
    { tag: [t.function(t.variableName), t.definition(t.variableName)], color: '#24292e' },
    { tag: t.typeName, color: '#0550ae' },
    { tag: t.className, color: '#0550ae' },
  ],
});

interface CodeBlockProps {
  code: string;
  language?: Language;
  theme?: 'dark' | 'light';
  title?: string;
  className?: string;
  secretMask?: {
    line: number;
    maskStart?: number;
    maskEnd?: number;
  }[];
}

/**
 * A code block component that supports syntax highlighting and secret masking.
 *
 * @example
 * // Example 1: Basic usage with syntax highlighting
 * <CodeBlock
 *   code="const greeting = 'Hello, World!';"
 *   language="typescript"
 * />
 *
 * @example
 * // Example 2: Mask entire lines
 * <CodeBlock
 *   code={`const config = {
 *   apiKey: 'abc123xyz',
 *   secret: 'very-secret-value',
 *   debug: true
 * }`}
 *   secretMask={[
 *     { line: 2 }, // Masks the entire apiKey line
 *     { line: 3 }, // Masks the entire secret line
 *   ]}
 * />
 *
 * @example
 * // Example 3: Mask specific parts of lines
 * <CodeBlock
 *   code={`const config = {
 *   apiKey: 'abc123xyz',
 *   debug: true
 * }`}
 *   secretMask={[
 *     { line: 2, maskStart: 10, maskEnd: 21 }, // Only masks 'abc123xyz'
 *   ]}
 *   title="Configuration"
 * />
 */
export function CodeBlock({
  code,
  language = 'typescript',
  theme = 'dark',
  title,
  className,
  secretMask = [],
}: CodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const hasSecrets = secretMask.length > 0;

  const getMaskedCode = () => {
    if (!hasSecrets || showSecrets) return code;

    const lines = code.split('\n');

    secretMask.forEach(({ line, maskStart, maskEnd }) => {
      if (line > lines.length) return;

      const lineIndex = line - 1;
      const lineContent = lines[lineIndex];

      if (maskStart !== undefined && maskEnd !== undefined) {
        // Mask only part of the line
        lines[lineIndex] =
          lineContent.substring(0, maskStart) + '•'.repeat(maskEnd - maskStart) + lineContent.substring(maskEnd);
      } else {
        // Mask the entire line
        lines[lineIndex] = '•'.repeat(lineContent.length);
      }
    });

    return lines.join('\n');
  };

  const ActionButtons = () => (
    <>
      {hasSecrets && (
        <button
          type="button"
          onClick={() => setShowSecrets(!showSecrets)}
          className={cn(
            'rounded-md p-2 transition-all duration-200 active:scale-95',
            theme === 'light'
              ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              : 'text-foreground-400 hover:text-foreground-50 hover:bg-[#32424a]'
          )}
          title={showSecrets ? 'Hide secrets' : 'Reveal secrets'}
        >
          {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
      <button
        onClick={copyToClipboard}
        type="button"
        className={cn(
          'rounded-md p-2 transition-all duration-200 active:scale-95',
          theme === 'light'
            ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            : 'text-foreground-400 hover:text-foreground-50 hover:bg-[#32424a]'
        )}
        title="Copy code"
      >
        {isCopied ? <Check className="h-4 w-4" /> : <RiFileCopyLine className="h-4 w-4" />}
      </button>
    </>
  );

  return (
    <div
      className={cn(
        'w-full rounded-xl border px-2 py-1',
        theme === 'light' ? 'border-neutral-200 bg-white' : 'border-neutral-700 bg-neutral-800',
        !title && 'rounded-b-none py-3',
        className
      )}
    >
      {title ? (
        <div className={cn('-mx-[5px] -mt-[5px] mb-0 flex items-center justify-between px-2 py-1')}>
          <span className={cn('text-xs', theme === 'light' ? 'text-gray-600' : 'text-foreground-400')}>{title}</span>
          <div className="ml-auto flex items-center gap-1">
            <ActionButtons />
          </div>
        </div>
      ) : (
        <div className="relative">
          <div
            className={cn(
              'absolute right-1 top-0 z-10 flex items-center gap-1 rounded-md',
              theme === 'light' ? '' : 'bg-neutral-800/80',
              'backdrop-blur-sm'
            )}
          >
            <ActionButtons />
          </div>
        </div>
      )}
      <CodeMirror
        value={getMaskedCode()}
        theme={theme === 'dark' ? darkTheme : lightTheme}
        extensions={[languageMap[language]()]}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: false,
          highlightActiveLine: false,
          foldGutter: false,
        }}
        editable={false}
        className={cn('overflow-hidden rounded-lg text-xs [&_.cm-editor]:py-3 [&_.cm-scroller]:font-mono')}
      />
    </div>
  );
}
