import { NodeViewProps } from '@tiptap/core';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import { useMemo } from 'react';
import { cn } from '@/editor/utils/classname';
import { HtmlCodeBlockAttributes } from './html';

export function HTMLCodeBlockView(props: NodeViewProps) {
  const { node, updateAttributes } = props;

  let { language, activeTab = 'code' } = node.attrs as HtmlCodeBlockAttributes;
  activeTab ||= 'code';

  const languageClass = language ? `language-${language}` : '';

  const html = useMemo(() => {
    const text = node.content.content.reduce((acc, cur) => {
      if (cur.type.name === 'text') {
        return acc + cur.text;
      } else if (cur.type.name === 'variable') {
        const { id: variable, fallback } = cur?.attrs || {};
        const formattedVariable = fallback ? `{{${variable},fallback=${fallback}}}` : `{{${variable}}}`;
        return acc + formattedVariable;
      }

      return acc;
    }, '');

    const htmlParser = new DOMParser();
    const htmlDoc = htmlParser.parseFromString(text, 'text/html');
    const style = htmlDoc.querySelectorAll('style');
    const body = htmlDoc.body;
    const combinedStyle = Array.from(style)
      .map((s) => s.innerHTML)
      .join('\n');

    return `<style>${combinedStyle}</style>${body.innerHTML}`;
  }, [activeTab]);

  const isEmpty = html === '';

  return (
    <NodeViewWrapper draggable={false} data-drag-handle={false} data-type="htmlCodeBlock">
      {activeTab === 'code' && (
        <pre className="mly-my-0 mly-rounded-lg mly-border mly-border-gray-200 mly-bg-white mly-p-2 mly-text-black">
          <NodeViewContent as="code" className={cn('is-editable', languageClass)} />
        </pre>
      )}

      {activeTab === 'preview' && (
        <div
          className={cn(
            'mly-not-prose mly-rounded-lg mly-border mly-border-gray-200 mly-p-2',
            isEmpty && 'mly-min-h-[42px]'
          )}
          ref={(node) => {
            if (!node || node?.shadowRoot) {
              return;
            }
            const shadow = node.attachShadow({ mode: 'open' });
            const sheet = new CSSStyleSheet();
            sheet.replaceSync(`
              * { font-family: 'Inter', system-ui, sans-serif; }
              blockquote, h1, h2, h3, img, li, ol, p, ul {
                margin-top: 0;
                margin-bottom: 0;
              }
            `);
            shadow.adoptedStyleSheets = [sheet];
            const container = document.createElement('div');
            container.innerHTML = html;
            shadow.appendChild(container);
          }}
          contentEditable={false}
          onClick={() => {
            if (!isEmpty) {
              return;
            }

            updateAttributes({
              activeTab: 'code',
            });
          }}
        />
      )}
    </NodeViewWrapper>
  );
}
