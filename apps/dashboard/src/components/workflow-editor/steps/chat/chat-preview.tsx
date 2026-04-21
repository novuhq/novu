import { ChannelTypeEnum, ChatCompiledPreviews, ChatRenderOutput, GeneratePreviewResponseDto } from '@novu/shared';
import { useState } from 'react';
import { RiSendPlane2Fill } from 'react-icons/ri';
import { LogoCircle } from '@/components/icons';
import { Skeleton } from '@/components/primitives/skeleton';
import { cn } from '@/utils/ui';

type PlatformTab = 'text' | 'slack' | 'teams' | 'discord';

const PLATFORM_LABEL: Record<PlatformTab, string> = {
  text: 'Text',
  slack: 'Slack',
  teams: 'Teams',
  discord: 'Discord',
};

function useChatPreviewResult(previewData?: GeneratePreviewResponseDto): ChatRenderOutput | null {
  if (previewData?.result?.type !== ChannelTypeEnum.CHAT) return null;

  return previewData.result.preview as ChatRenderOutput;
}

export const ChatPreview = ({
  isPreviewPending,
  previewData,
  variant = 'default',
}: {
  isPreviewPending: boolean;
  previewData?: GeneratePreviewResponseDto;
  variant?: 'mini' | 'default';
}) => {
  const preview = useChatPreviewResult(previewData);
  const body = preview?.body ?? '';
  const previews = preview?.compiledPreviews;
  const hasRichContent = !!previews && (previews.slack || previews.teams || previews.discord);

  const [activeTab, setActiveTab] = useState<PlatformTab>('text');

  if (variant === 'mini' || !hasRichContent) {
    return <TextOnlyPreview body={body} isPreviewPending={isPreviewPending} variant={variant} />;
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center gap-1 rounded-lg bg-neutral-50 p-1 w-fit" role="tablist">
        {(['slack', 'teams', 'discord', 'text'] as PlatformTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              activeTab === tab
                ? 'bg-white text-foreground-950 shadow-sm'
                : 'text-foreground-600 hover:text-foreground-950'
            )}
          >
            {PLATFORM_LABEL[tab]}
          </button>
        ))}
      </div>

      {activeTab === 'text' && <TextOnlyPreview body={body} isPreviewPending={isPreviewPending} variant="default" />}
      {activeTab === 'slack' && <SlackBlocksPreview previews={previews} body={body} />}
      {activeTab === 'teams' && <AdaptiveCardPreview previews={previews} body={body} />}
      {activeTab === 'discord' && <DiscordEmbedPreview previews={previews} body={body} />}
    </div>
  );
};

function TextOnlyPreview({
  body,
  isPreviewPending,
  variant,
}: {
  body: string;
  isPreviewPending: boolean;
  variant: 'mini' | 'default';
}) {
  return (
    <div className="relative w-full rounded-xl border border-dashed border-[#E1E4EA] p-3">
      <div className="flex flex-col gap-3">
        <div className="flex w-full items-start gap-2">
          <div className="flex size-6 items-center rounded-[5px] bg-neutral-800 p-0.5 text-sm font-medium">
            <LogoCircle />
          </div>
          <div className="flex w-full flex-col gap-1">
            <div className="flex items-center gap-1">
              <span className="text-foreground-950 text-xs font-bold">Novu</span>
              <span className="text-2xs text-foreground-600 bg-neutral-alpha-100 flex h-4 items-center rounded-sm px-1 opacity-70">
                APP
              </span>
              <span className="text-foreground-600 text-2xs opacity-70">12:45</span>
            </div>
            {isPreviewPending ? (
              <Skeleton className="h-4 w-1/2" />
            ) : (
              <span
                className={cn('text-foreground-950 min-h-4 whitespace-pre-wrap text-xs font-normal', {
                  'line-clamp-3': variant === 'mini',
                })}
                title={variant === 'mini' ? body : undefined}
              >
                {body}
              </span>
            )}
          </div>
        </div>
        {variant === 'default' && (
          <div className="relative z-10 flex items-start rounded-sm border border-neutral-100 px-2 py-1 pb-6">
            <div className="flex w-full items-center justify-between">
              <span className="text-foreground-300 text-xs font-normal">Jot something down</span>
              <RiSendPlane2Fill className="text-foreground-300 size-3" />
            </div>
          </div>
        )}
      </div>
      <div className="to-background absolute -bottom-1 -left-1 -right-1 z-0 h-16 bg-linear-to-b from-transparent to-80%" />
    </div>
  );
}

/**
 * Visualisation of compiled Slack Block Kit. We don't embed Slack's real
 * renderer (it's 300KB+ and unmaintained in browser form) — instead we
 * walk the blocks and produce a layout-faithful approximation: section
 * text, headers, dividers, action rows, image blocks. This is the same
 * fidelity pattern the Slack Block Kit Builder uses in its pane view.
 */
function SlackBlocksPreview({ previews, body }: { previews?: ChatCompiledPreviews; body: string }) {
  const blocks =
    previews && Array.isArray(previews.slack) ? (previews.slack as Array<Record<string, unknown>>) : null;

  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-3">
      {blocks ? (
        <div className="flex flex-col gap-2">
          {blocks.map((block, idx) => (
            <SlackBlock key={idx} block={block} />
          ))}
        </div>
      ) : (
        <div className="text-xs text-foreground-600">{body}</div>
      )}
    </div>
  );
}

function SlackBlock({ block }: { block: Record<string, unknown> }) {
  const type = block.type as string | undefined;
  switch (type) {
    case 'header': {
      const text = (block.text as { text?: string } | undefined)?.text ?? '';

      return <div className="text-sm font-semibold text-foreground-950">{text}</div>;
    }
    case 'section': {
      const text = (block.text as { text?: string } | undefined)?.text ?? '';

      return <div className="whitespace-pre-wrap text-xs text-foreground-800">{text}</div>;
    }
    case 'divider':
      return <div className="my-1 h-px w-full bg-neutral-100" />;
    case 'actions': {
      const elements = Array.isArray(block.elements) ? (block.elements as Array<Record<string, unknown>>) : [];

      return (
        <div className="flex flex-wrap gap-1.5">
          {elements.map((el, idx) => {
            const label = (el.text as { text?: string } | undefined)?.text ?? '';

            return (
              <span key={idx} className="rounded-md border border-neutral-200 px-2 py-1 text-xs">
                {label}
              </span>
            );
          })}
        </div>
      );
    }
    case 'image': {
      const imageUrl = block.image_url as string | undefined;
      if (!imageUrl) return null;

      return <img src={imageUrl} alt="" className="max-h-48 rounded" />;
    }
    case 'context': {
      const elements = Array.isArray(block.elements) ? (block.elements as Array<Record<string, unknown>>) : [];

      return (
        <div className="flex gap-2 text-2xs text-foreground-400">
          {elements.map((el, idx) => {
            const text = (el.text as string | undefined) ?? '';

            return <span key={idx}>{text}</span>;
          })}
        </div>
      );
    }
    default:
      return <pre className="text-2xs text-foreground-400">{JSON.stringify(block)}</pre>;
  }
}

/**
 * Adaptive Card preview — we similarly walk the compiled JSON and render
 * a visual approximation rather than pulling in the Microsoft Adaptive
 * Cards renderer (which targets desktop canvases, not React). Close
 * enough to catch layout mistakes at authoring time.
 */
function AdaptiveCardPreview({ previews, body }: { previews?: ChatCompiledPreviews; body: string }) {
  const card = previews?.teams as { body?: unknown[]; actions?: unknown[] } | undefined;

  if (!card) return <div className="text-xs text-foreground-600">{body}</div>;

  const elements = Array.isArray(card.body) ? card.body : [];
  const actions = Array.isArray(card.actions) ? card.actions : [];

  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-3">
      <div className="flex flex-col gap-2">
        {elements.map((el, idx) => (
          <AdaptiveCardElement key={idx} element={el as Record<string, unknown>} />
        ))}
      </div>
      {actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {actions.map((action, idx) => {
            const title = (action as Record<string, unknown>).title as string | undefined;

            return (
              <span key={idx} className="rounded-md bg-primary-base px-2.5 py-1 text-xs text-white">
                {title}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdaptiveCardElement({ element }: { element: Record<string, unknown> }) {
  switch (element.type as string | undefined) {
    case 'TextBlock':
      return (
        <div
          className={cn(
            'whitespace-pre-wrap',
            element.weight === 'Bolder' || element.size === 'Large'
              ? 'text-sm font-semibold text-foreground-950'
              : 'text-xs text-foreground-800'
          )}
        >
          {String(element.text ?? '')}
        </div>
      );
    case 'Image':
      return <img src={String(element.url ?? '')} alt="" className="max-h-48 rounded" />;
    case 'FactSet': {
      const facts = Array.isArray(element.facts) ? (element.facts as Array<Record<string, unknown>>) : [];

      return (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          {facts.map((fact, idx) => (
            <div key={idx} className="contents">
              <dt className="font-medium text-foreground-600">{String(fact.title ?? '')}</dt>
              <dd className="text-foreground-950">{String(fact.value ?? '')}</dd>
            </div>
          ))}
        </dl>
      );
    }
    default:
      return <div className="text-2xs text-foreground-400">{String(element.type ?? 'element')}</div>;
  }
}

function DiscordEmbedPreview({ previews, body }: { previews?: ChatCompiledPreviews; body: string }) {
  const embeds =
    previews && Array.isArray(previews.discord) ? (previews.discord as Array<Record<string, unknown>>) : null;

  if (!embeds || embeds.length === 0) {
    return <div className="rounded-xl border border-neutral-100 bg-white p-3 text-xs text-foreground-600">{body}</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {body && <div className="text-xs text-foreground-800">{body}</div>}
      {embeds.map((embed, idx) => (
        <div key={idx} className="rounded-md border-l-4 border-l-primary-base bg-neutral-50 p-3 text-xs">
          {typeof embed.title === 'string' && (
            <div className="font-semibold text-foreground-950">{embed.title}</div>
          )}
          {typeof embed.description === 'string' && (
            <div className="mt-1 whitespace-pre-wrap text-foreground-800">{embed.description}</div>
          )}
          {Array.isArray(embed.fields) && (
            <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              {(embed.fields as Array<Record<string, unknown>>).map((field, fieldIdx) => (
                <div key={fieldIdx} className="contents">
                  <span className="font-medium text-foreground-600">{String(field.name ?? '')}</span>
                  <span className="text-foreground-950">{String(field.value ?? '')}</span>
                </div>
              ))}
            </div>
          )}
          {(embed.image as { url?: string } | undefined)?.url && (
            <img src={(embed.image as { url: string }).url} alt="" className="mt-2 max-h-48 rounded" />
          )}
        </div>
      ))}
    </div>
  );
}
