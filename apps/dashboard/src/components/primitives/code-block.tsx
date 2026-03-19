import { tags as t } from '@lezer/highlight';
import { langs, loadLanguage } from '@uiw/codemirror-extensions-langs';
import { createTheme } from '@uiw/codemirror-themes';
import CodeMirror from '@uiw/react-codemirror';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../utils/ui';
import { CopyToClipboard } from './copy-to-clipboard';

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
    background: '#161b22',
    foreground: '#f9fafb',
    caret: '#f9fafb',
    selection: '#264f78',
    lineHighlight: '#1c2128',
    gutterBackground: '#161b22',
    gutterForeground: '#6e7681',
    gutterBorder: 'transparent',
  },
  styles: [
    { tag: t.keyword, color: '#bb9af7' },
    { tag: t.operator, color: '#ffffff' },
    { tag: t.brace, color: '#ffffff' },
    { tag: t.propertyName, color: '#f7d025' },
    { tag: t.definition(t.propertyName), color: '#9cdcfe' },
    { tag: t.string, color: '#49d18a' },
    { tag: t.comment, color: '#8b949e' },
    { tag: t.variableName, color: '#9cdcfe' },
    { tag: [t.function(t.variableName), t.definition(t.variableName)], color: '#1bc6f2' },
    { tag: t.typeName, color: '#ffcb6b' },
    { tag: t.className, color: '#ffcb6b' },
    { tag: t.number, color: '#f7d025' },
    { tag: t.bool, color: '#bb4d60' },
  ],
});

const lightTheme = createTheme({
  theme: 'light',
  settings: {
    background: '#ffffff',
    foreground: '#24292e',
    caret: '#24292e',
    selection: '#b3d4fc',
    lineHighlight: '#f5f5f5',
    gutterBackground: '#ffffff',
    gutterForeground: '#6e7681',
    gutterBorder: 'transparent',
  },
  styles: [
    { tag: t.keyword, color: '#d73a49' },
    { tag: t.operator, color: '#d73a49' },
    { tag: t.brace, color: '#24292e' },
    { tag: t.propertyName, color: '#005cc5' },
    { tag: t.definition(t.propertyName), color: '#005cc5' },
    { tag: t.string, color: '#032f62' },
    { tag: t.comment, color: '#6a737d' },
    { tag: t.variableName, color: '#e36209' },
    { tag: [t.function(t.variableName), t.definition(t.variableName)], color: '#6f42c1' },
    { tag: t.typeName, color: '#005cc5' },
    { tag: t.className, color: '#005cc5' },
    { tag: t.number, color: '#005cc5' },
    { tag: t.bool, color: '#d73a49' },
  ],
});

export interface CodeBlockProps {
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
  actionButtons?: React.ReactNode;
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
  actionButtons,
}: CodeBlockProps) {
  const [showSecrets, setShowSecrets] = useState(false);
  const [showGradient, setShowGradient] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const hasSecrets = secretMask.length > 0;

  const maskedCode = useMemo(() => {
    if (!hasSecrets || showSecrets) return code;

    const lines = code.split('\n');

    for (const mask of secretMask) {
      const { line, maskStart, maskEnd } = mask;
      if (line > lines.length) continue;

      const lineIndex = line - 1;
      const lineContent = lines[lineIndex];

      if (maskStart !== undefined && maskEnd !== undefined) {
        lines[lineIndex] =
          lineContent.substring(0, maskStart) + '•'.repeat(maskEnd - maskStart) + lineContent.substring(maskEnd);
      } else {
        lines[lineIndex] = '•'.repeat(lineContent.length);
      }
    }

    return lines.join('\n');
  }, [code, hasSecrets, showSecrets, secretMask]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let resizeObserver: ResizeObserver | null = null;
    let scrollElement: Element | null = null;

    const checkScroll = () => {
      if (!scrollElement) return;

      const hasHorizontalScroll = scrollElement.scrollWidth > scrollElement.clientWidth;
      const isScrolledToEnd =
        Math.abs(scrollElement.scrollWidth - scrollElement.clientWidth - scrollElement.scrollLeft) < 1;

      setShowGradient(hasHorizontalScroll && !isScrolledToEnd);
    };

    const setupListeners = () => {
      scrollElement = container.querySelector('.cm-scroller');
      if (scrollElement) {
        scrollElement.addEventListener('scroll', checkScroll);
        checkScroll();

        resizeObserver = new ResizeObserver(checkScroll);
        resizeObserver.observe(scrollElement);
      }
    };

    const timeoutId = setTimeout(setupListeners, 0);

    return () => {
      clearTimeout(timeoutId);
      if (scrollElement) {
        scrollElement.removeEventListener('scroll', checkScroll);
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maskedCode]);

  const showToolbar = hasSecrets || actionButtons === undefined;

  return (
    <div
      className={cn(
        'flex w-full flex-col overflow-hidden rounded-xl border',
        theme === 'light' ? 'border-neutral-200 bg-white shadow-sm' : 'border-neutral-800/50 bg-[#0d1117] shadow-lg',
        !title && 'group',
        className
      )}
    >
      {title && (
        <div
          className={cn('flex items-center justify-between px-4 py-2', theme === 'light' ? 'bg-white' : 'bg-[#0d1117]')}
        >
          <span className={cn('text-xs font-medium', theme === 'light' ? 'text-neutral-700' : 'text-neutral-300')}>
            {title}
          </span>
          {showToolbar && (
            <div className="ml-auto flex items-center gap-1">
              {hasSecrets && (
                <button
                  type="button"
                  onClick={() => setShowSecrets(!showSecrets)}
                  className={cn(
                    'rounded-md p-1.5 transition-all duration-200 active:scale-95',
                    theme === 'light'
                      ? 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                  )}
                  title={showSecrets ? 'Hide secrets' : 'Reveal secrets'}
                >
                  {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              )}
              {actionButtons ?? (
                <CopyToClipboard
                  content={code}
                  theme={theme}
                  className={cn(
                    'rounded-md p-1.5 transition-all duration-200 active:scale-95',
                    theme === 'light'
                      ? 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                  )}
                  title="Copy code"
                />
              )}
            </div>
          )}
        </div>
      )}

      {!title && (
        <div className="relative">
          <div
            className={cn(
              'absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md',
              'opacity-0 transition-opacity duration-200 group-hover:opacity-100',
              theme === 'light' ? 'bg-white/90' : 'bg-[#0d1117]/90',
              'backdrop-blur-xs border',
              theme === 'light' ? 'border-neutral-200' : 'border-neutral-800/50'
            )}
          >
            {hasSecrets && (
              <button
                type="button"
                onClick={() => setShowSecrets(!showSecrets)}
                className={cn(
                  'rounded-md p-1.5 transition-all duration-200 active:scale-95',
                  theme === 'light'
                    ? 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                )}
                title={showSecrets ? 'Hide secrets' : 'Reveal secrets'}
              >
                {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            )}
            {actionButtons ?? <CopyToClipboard content={code} theme={theme} title="Copy code" />}
          </div>
        </div>
      )}

      <div className={cn('flex h-full flex-col overflow-hidden px-[4px] pb-[4px]', !title && 'pt-[4px]')}>
        <div
          ref={scrollContainerRef}
          className={cn(
            'relative h-full overflow-y-auto rounded-lg border p-2.5',
            theme === 'light' ? 'border-neutral-200 bg-neutral-50' : 'border-neutral-600/50 bg-[#161b22]'
          )}
        >
          {showGradient && (
            <div
              className={cn(
                'pointer-events-none absolute right-2.5 top-2.5 bottom-2.5 z-10 w-8 rounded-r-lg',
                theme === 'light'
                  ? 'bg-linear-to-l from-neutral-50 to-transparent'
                  : 'bg-linear-to-l from-[#161b22] to-transparent'
              )}
            />
          )}
          <CodeMirror
            value={maskedCode}
            theme={theme === 'dark' ? darkTheme : lightTheme}
            extensions={[languageMap[language]()]}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLineGutter: false,
              highlightActiveLine: false,
              foldGutter: false,
            }}
            editable={false}
            className={cn(
              'overflow-auto text-xs [&_.cm-editor]:py-0 [&_.cm-scroller]:font-mono [&_.cm-editor]:bg-transparent',
              '[&_.cm-gutters]:border-0 [&_.cm-lineNumbers]:min-w-[3ch]',
              className
            )}
          />
        </div>
      </div>
    </div>
  );
}
