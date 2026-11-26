import { type ComponentProps, useState } from 'react';
import { RiArrowRightSLine } from 'react-icons/ri';
import { MessageResponse } from '@/components/ai-elements/message';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { openInNewTab, toSafeExternalUrl } from '@/utils/url';
import { getCopilotLinkKind, isModifiedClick } from './copilot-web-chat-utils';
import { useCopilotLinkNavigate } from './use-copilot-link-navigate';

type MarkdownElementProps<T extends 'a' | 'details' | 'summary'> = ComponentProps<T> & { node?: unknown };

const LINK_CLASS_NAME = 'wrap-anywhere font-medium text-primary underline';

function CopilotMarkdownLink({ href, children }: MarkdownElementProps<'a'>) {
  const navigateInPlace = useCopilotLinkNavigate();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const kind = getCopilotLinkKind(href, window.location.origin);
  const externalHref = kind === 'external' ? toSafeExternalUrl(href) : undefined;

  if (kind === 'dashboard' && href) {
    return (
      <a
        href={href}
        className={LINK_CLASS_NAME}
        onClick={(event) => {
          if (isModifiedClick(event)) return;

          event.preventDefault();
          navigateInPlace(href);
        }}
      >
        {children}
      </a>
    );
  }

  if (!externalHref) return <span>{children}</span>;

  return (
    <>
      <a
        href={externalHref}
        target="_blank"
        rel="noopener noreferrer"
        className={LINK_CLASS_NAME}
        onClick={(event) => {
          event.preventDefault();
          setIsConfirmOpen(true);
        }}
      >
        {children}
      </a>
      <ConfirmationModal
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        onConfirm={() => {
          openInNewTab(externalHref);
          setIsConfirmOpen(false);
        }}
        title="Open external link?"
        description={
          <>
            You're about to visit an external website:{' '}
            <span className="break-all font-mono text-xs text-text-strong">{externalHref}</span>
          </>
        }
        confirmButtonText="Open link"
      />
    </>
  );
}

/** Collapsed until clicked, like the reasoning above the reply: a chevron row, then the content on a rule. */
function CopilotDetails({ children, node: _node, ...props }: MarkdownElementProps<'details'>) {
  return (
    <details
      {...props}
      className="group/details mb-2 [&>:not(summary)]:ml-[7px] [&>:not(summary)]:mt-1 [&>:not(summary)]:border-l [&>:not(summary)]:border-stroke-soft [&>:not(summary)]:pl-2.5 [&>:not(summary)]:text-text-sub"
    >
      {children}
    </details>
  );
}

function CopilotDetailsSummary({ children, node: _node, ...props }: MarkdownElementProps<'summary'>) {
  return (
    <summary
      {...props}
      className="flex w-fit cursor-pointer list-none items-center gap-1 text-text-soft hover:text-text-sub [&::-webkit-details-marker]:hidden"
    >
      <RiArrowRightSLine className="size-3.5 shrink-0 transition-transform group-open/details:rotate-90" aria-hidden />
      {children}
    </summary>
  );
}

const COPILOT_MARKDOWN_COMPONENTS = {
  a: CopilotMarkdownLink,
  details: CopilotDetails,
  summary: CopilotDetailsSummary,
};

/** The Copilot's reply text as markdown, with its links and collapsed blocks. */
export function CopilotMarkdown({ children }: { children: string }) {
  return <MessageResponse components={COPILOT_MARKDOWN_COMPONENTS}>{children}</MessageResponse>;
}
