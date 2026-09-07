import { makeAssistantDataUI, TextMessagePartProvider } from '@assistant-ui/react';
import type { AgentCardPart, AgentMessage } from '@novu/react';
import { useState } from 'react';
import { RiLoader4Line } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { cardViewFromElement } from './card-view';
import { ConnectCard } from './elements/connect-card';
import { File } from './elements/file';
import { MarkdownText } from './elements/markdown-text';
import { useWebChatUi } from './web-chat-actions';

type McpPart = Extract<AgentMessage['parts'][number], { type: 'mcp-connection' }>;
type FilePart = Extract<AgentMessage['parts'][number], { type: 'file' }>;

export const NovuCardUI = makeAssistantDataUI<AgentCardPart>({
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

// biome-ignore lint/style/useComponentExportOnlyModules: used by NovuCardUI
function NovuCard({ data }: { data: AgentCardPart }) {
  const { sendAction, composerBusy } = useWebChatUi();
  const [busyId, setBusyId] = useState<string>();
  const view = cardViewFromElement(data.card);

  async function clickButton(actionId: string, value?: string) {
    if (busyId || composerBusy) return;
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
      className="border-stroke-soft bg-bg-white shadow-regular-xs w-full overflow-hidden rounded-2xl rounded-tl-md border"
    >
      {view.imageUrl ? (
        <img
          src={view.imageUrl}
          alt={view.title ?? ''}
          className="border-stroke-soft max-h-40 w-full border-b object-cover"
        />
      ) : null}
      <div className="flex flex-col gap-2 p-3">
        {view.title ? <p className="text-label-sm text-text-strong font-medium">{view.title}</p> : null}
        {view.subtitle ? <p className="text-paragraph-xs text-text-soft">{view.subtitle}</p> : null}
        {view.children.map((child, index) => {
          switch (child.type) {
            case 'text':
              return (
                <div key={index} className="text-paragraph-sm text-text-strong leading-5">
                  <TextMessagePartProvider text={child.content}>
                    <MarkdownText />
                  </TextMessagePartProvider>
                </div>
              );
            case 'divider':
              return <hr key={index} className="border-stroke-soft my-1" />;
            case 'image':
              return (
                <img
                  key={index}
                  src={child.url}
                  alt={child.alt}
                  className="border-stroke-soft max-h-40 w-full rounded-md border object-cover"
                />
              );
            case 'link':
              return (
                <a
                  key={index}
                  href={child.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-base text-sm font-medium underline underline-offset-2"
                >
                  {child.label}
                </a>
              );
            case 'actions': {
              return (
                <div key={index} className="flex flex-wrap items-center gap-2 pt-1">
                  {child.buttons.map((button) => {
                    const busy = busyId === button.id;
                    const appearance =
                      button.style === 'danger'
                        ? { variant: 'error' as const, mode: 'outline' as const }
                        : button.style === 'primary'
                          ? { variant: 'primary' as const, mode: 'filled' as const }
                          : { variant: 'secondary' as const, mode: 'outline' as const };

                    return (
                      <Button
                        key={button.id}
                        type="button"
                        size="2xs"
                        variant={appearance.variant}
                        mode={appearance.mode}
                        disabled={Boolean(busyId) || composerBusy}
                        leadingIcon={busy ? RiLoader4Line : undefined}
                        className={busy ? '[&_svg]:animate-spin' : undefined}
                        onClick={() => void clickButton(button.id, button.value)}
                      >
                        {button.label}
                      </Button>
                    );
                  })}
                </div>
              );
            }
            default:
              return null;
          }
        })}
      </div>
    </article>
  );
}
