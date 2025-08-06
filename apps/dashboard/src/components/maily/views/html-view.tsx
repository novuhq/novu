import { NodeViewProps, NodeViewRendererProps } from '@tiptap/core';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import { useEffect, useMemo, useRef } from 'react';
import { RiCodeBlock } from 'react-icons/ri';
import { cn } from '@/utils/ui';

type HtmlCodeBlockAttributes = {
  activeTab: string;
  showIfKey: string;
  language: string;
};

type NodeContent = {
  type: {
    name: string;
  };
  text?: string;
  attrs?: {
    id: string;
    fallback?: string;
  };
};

/**
 * Reset default margin styles in email clients
 *
 * Email clients can have inconsistent default margins for common HTML elements
 * which can break email layouts. This CSS resets margins to 0 and sets a consistent
 * line height to ensure predictable spacing across different email clients.
 */
const EMAIL_RESET_MARGIN_STYLES = `
  <style>
    blockquote, h1, h2, h3, img, li, ol, p, ul {
      margin-top: 0;
      margin-bottom: 0;
      line-height: 1.5rem;
    }
  </style>
`;

function CodeView() {
  return (
    <div className="mx-[-0.5rem] rounded-md border p-[2px]">
      <pre className="mly-text-black font-code my-0 rounded-md border border-dashed border-gray-300 bg-white p-2 text-xs leading-[18px]">
        <NodeViewContent as="code" className={'is-editable language-html'} />
      </pre>
    </div>
  );
}

function PreviewView(props: { node: NodeViewRendererProps['node']; onClick: () => void }) {
  const { node, onClick } = props;

  const parseNodeContent = (content: NodeContent[]): string => {
    const handleNode = (node: NodeContent): string => {
      switch (node.type.name) {
        case 'text':
          return node.text || '';

        case 'variable': {
          const { id: variable, fallback } = node.attrs || {};
          return fallback ? `{{${variable},fallback=${fallback}}}` : `{{${variable}}}`;
        }

        default:
          return '';
      }
    };

    return content.reduce((acc, node) => acc + handleNode(node), '');
  };

  const html = useMemo(() => {
    // @ts-expect-error - TipTap's type definitions don't fully capture the node structure
    const nodeContent = node.content?.content as NodeContent[] | undefined;
    if (!nodeContent) return '';

    const text = parseNodeContent(nodeContent);
    const htmlDoc = new DOMParser().parseFromString(text, 'text/html');

    // get styles from head
    const styles = Array.from(htmlDoc.head.getElementsByTagName('style'))
      .map((style) => style.outerHTML)
      .join('');

    // combine styles with body content
    return styles + htmlDoc.body.innerHTML;
  }, [node.content]);

  return (
    <div className="group relative cursor-pointer" onClick={onClick}>
      <div
        className={cn(
          'mx-[-0.5rem] min-h-[42px] rounded-md border px-2',
          'border-transparent group-hover:border-[#E4E4E7]',
          'flex flex-col justify-center'
        )}
        contentEditable={false}
        // use shadow DOM to isolate the styles
        ref={(node) => {
          if (node && !node.shadowRoot) {
            const shadow = node.attachShadow({ mode: 'open' });
            shadow.innerHTML = EMAIL_RESET_MARGIN_STYLES + html;
          }
        }}
      />
      <div className="border-soft-100 absolute right-[-10px] top-[-3px] hidden cursor-grab items-center justify-center gap-[2px] rounded border bg-white px-1 py-[2px] group-hover:flex">
        <RiCodeBlock className="size-2.5 flex-shrink-0" />
        <span className="text-2xs font-medium leading-[1]">html</span>
      </div>
    </div>
  );
}

export function HTMLCodeBlockView(props: NodeViewProps) {
  const { node, updateAttributes } = props;
  const { activeTab: rawActiveTab } = node.attrs as HtmlCodeBlockAttributes;
  const activeTab = rawActiveTab || 'code';

  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /*
     * When clicking outside the code block (except for the bubble menu),
     * switch to preview mode.
     */
    if (activeTab !== 'code') return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isClickingBubbleMenu =
        target.closest('.tippy-box') || target.closest('[data-radix-popper-content-wrapper]');

      if (isClickingBubbleMenu) return;

      const isClickingOutside = nodeRef.current && !nodeRef.current.contains(target);

      if (!isClickingOutside) return;

      // manually select text to force hiding the bubble menu
      props.editor?.commands.setTextSelection(0);
      updateAttributes({ activeTab: 'preview' });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeTab, updateAttributes, props.editor]);

  const handlePreviewClick = () => {
    updateAttributes({ activeTab: 'code' });
    props.editor?.commands.setTextSelection(props.getPos() + 1);
  };

  return (
    <NodeViewWrapper draggable={false} data-drag-handle={false} data-type="htmlCodeBlock" ref={nodeRef}>
      {activeTab === 'code' ? <CodeView /> : <PreviewView node={node} onClick={handlePreviewClick} />}
    </NodeViewWrapper>
  );
}
