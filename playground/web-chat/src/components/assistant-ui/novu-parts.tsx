'use client';

import type { AgentCardElement, AgentMessage } from '@novu/react';
import { makeAssistantDataUI, TextMessagePartProvider } from '@assistant-ui/react';
import { LoaderCircleIcon } from 'lucide-react';
import { useState } from 'react';
import { File } from '@/components/assistant-ui/elements/file';
import { MarkdownText } from '@/components/assistant-ui/elements/markdown-text';
import { field, pressable } from '@/components/assistant-ui/elements/surfaces';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { cardViewFromElement } from '../../lib/card-view';
import { ConnectCard } from '../connect-card';
import { useWebChatUi } from './web-chat-actions';

type NovuCardData = { card: AgentCardElement; sourceMessageId: string };
type McpPart = Extract<AgentMessage['parts'][number], { type: 'mcp-connection' }>;
type FilePart = Extract<AgentMessage['parts'][number], { type: 'file' }>;

export const NovuCardUI = makeAssistantDataUI<NovuCardData>({
  name: 'novu-card',
  render: ({ data }) => <NovuCard data={data} />,
});

export const NovuMcpUI = makeAssistantDataUI<McpPart>({
  name: 'novu-mcp',
  render: ({ data }) => <ConnectCard part={data} />,
});

export const NovuFileUI = makeAssistantDataUI<FilePart>({
  name: 'novu-file',
  render: ({ data }) => (
    <File
      type="file"
      status={{ type: 'complete' }}
      filename={data.name}
      data={data.fileId}
      mimeType={data.mediaType ?? ''}
      sourceType="id"
    />
  ),
});

function NovuCard({ data }: { data: NovuCardData }) {
  const { sendAction } = useWebChatUi();
  const [busyId, setBusyId] = useState<string>();
  const view = cardViewFromElement(data.card);

  async function clickButton(actionId: string, value?: string) {
    if (busyId) return;
    setBusyId(actionId);
    try {
      await sendAction({ actionId, sourceMessageId: data.sourceMessageId, value });
    } finally {
      setBusyId(undefined);
    }
  }

  return (
    <article
      data-slot="aui-novu-card"
      className="border-border/60 bg-background dark:bg-popover w-full overflow-hidden rounded-lg border"
    >
      {view.imageUrl ? (
        <img
          src={view.imageUrl}
          alt={view.title ?? ''}
          className="border-border/60 max-h-40 w-full border-b object-cover"
        />
      ) : null}
      <div className="flex flex-col gap-2 p-3">
        {view.title ? (
          <p className="text-foreground text-sm leading-snug font-semibold">{view.title}</p>
        ) : null}
        {view.subtitle ? (
          <p className={cn('text-muted-foreground rounded-md px-2.5 py-2 text-xs leading-relaxed', field)}>
            {view.subtitle}
          </p>
        ) : null}
        {view.children.map((child, index) => {
          switch (child.type) {
            case 'text':
              return (
                <div key={index} className="text-foreground text-sm leading-relaxed">
                  <TextMessagePartProvider text={child.content}>
                    <MarkdownText />
                  </TextMessagePartProvider>
                </div>
              );
            case 'divider':
              return <hr key={index} className="border-border/60 my-1 border-0 border-t" />;
            case 'image':
              return (
                <img
                  key={index}
                  src={child.url}
                  alt={child.alt}
                  className="border-border/60 max-h-40 w-full rounded-md border object-cover"
                />
              );
            case 'link':
              return (
                <a
                  key={index}
                  href={child.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary text-sm font-medium underline underline-offset-2 outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {child.label}
                </a>
              );
            case 'actions':
              return (
                <div key={index} className="flex flex-wrap items-center gap-2 pt-1">
                  {child.buttons.map((button) => {
                    const busy = busyId === button.id;
                    return (
                      <Button
                        key={button.id}
                        type="button"
                        size="sm"
                        variant={button.style === 'primary' ? 'default' : 'outline'}
                        className={pressable}
                        disabled={Boolean(busyId)}
                        aria-busy={busy}
                        onClick={() => void clickButton(button.id, button.value)}
                      >
                        {busy ? <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden /> : null}
                        {button.label}
                      </Button>
                    );
                  })}
                </div>
              );
          }
        })}
      </div>
    </article>
  );
}
