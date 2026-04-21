import { ChannelTypeEnum, ChatCompiledPreviews, ChatRenderOutput, GeneratePreviewResponseDto } from '@novu/shared';
import { useState } from 'react';
import {
  RiExternalLinkLine,
  RiImageLine,
  RiLink,
  RiSendPlane2Fill,
} from 'react-icons/ri';
import { LogoCircle } from '@/components/icons';
import { Button } from '@/components/primitives/button';
import { Skeleton } from '@/components/primitives/skeleton';
import { cn } from '@/utils/ui';

type PlatformTab = 'novu' | 'slack' | 'teams' | 'discord';

const PLATFORM_LABEL: Record<PlatformTab, string> = {
  novu: 'Novu',
  slack: 'Slack',
  teams: 'Teams',
  discord: 'Discord',
};

const PLATFORM_ORDER: PlatformTab[] = ['novu', 'slack', 'teams', 'discord'];

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
  const card = preview?.card;
  const previews = preview?.compiledPreviews;
  const hasCard = !!card && typeof card === 'object';

  const [activeTab, setActiveTab] = useState<PlatformTab>('novu');

  if (variant === 'mini') {
    return (
      <ChatMessageFrame variant="mini" isPreviewPending={isPreviewPending}>
        {hasCard ? (
          <NovuCardBody card={card as CardElementLike} />
        ) : (
          <PlainTextBody body={body} variant="mini" />
        )}
      </ChatMessageFrame>
    );
  }

  if (!hasCard) {
    return (
      <ChatMessageFrame variant="default" isPreviewPending={isPreviewPending}>
        <PlainTextBody body={body} variant="default" />
      </ChatMessageFrame>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-fit items-center gap-1 rounded-lg bg-neutral-50 p-1" role="tablist">
        {PLATFORM_ORDER.map((tab) => (
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

      {activeTab === 'novu' && (
        <ChatMessageFrame variant="default" isPreviewPending={isPreviewPending}>
          <NovuCardBody card={card as CardElementLike} />
        </ChatMessageFrame>
      )}
      {activeTab === 'slack' && <SlackBlocksPreview previews={previews} body={body} />}
      {activeTab === 'teams' && <AdaptiveCardPreview previews={previews} body={body} />}
      {activeTab === 'discord' && <DiscordEmbedPreview previews={previews} body={body} />}
    </div>
  );
};

/**
 * Shared "chat message" envelope used by the Novu preview and the legacy
 * text-only preview. Mirrors the visual frame customers see in Slack /
 * Teams — a branded avatar, sender name, and a composer stub below — so
 * the preview always reads as a chat message, not a bare layout dump.
 */
function ChatMessageFrame({
  children,
  variant,
  isPreviewPending,
}: {
  children: React.ReactNode;
  variant: 'mini' | 'default';
  isPreviewPending: boolean;
}) {
  return (
    <div className="relative w-full rounded-xl border border-dashed border-[#E1E4EA] p-3">
      <div className="flex flex-col gap-3">
        <div className="flex w-full items-start gap-2">
          <div className="flex size-6 items-center rounded-[5px] bg-neutral-800 p-0.5 text-sm font-medium">
            <LogoCircle />
          </div>
          <div className="flex w-full min-w-0 flex-col gap-1">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-foreground-950">Novu</span>
              <span className="text-2xs flex h-4 items-center rounded-sm bg-neutral-alpha-100 px-1 text-foreground-600 opacity-70">
                APP
              </span>
              <span className="text-2xs text-foreground-600 opacity-70">12:45</span>
            </div>
            {isPreviewPending ? <Skeleton className="h-4 w-1/2" /> : <div className="min-w-0">{children}</div>}
          </div>
        </div>
        {variant === 'default' && (
          <div className="relative z-10 flex items-start rounded-sm border border-neutral-100 px-2 py-1 pb-6">
            <div className="flex w-full items-center justify-between">
              <span className="text-xs font-normal text-foreground-300">Jot something down</span>
              <RiSendPlane2Fill className="size-3 text-foreground-300" />
            </div>
          </div>
        )}
      </div>
      <div className="to-background absolute -bottom-1 -left-1 -right-1 z-0 h-16 bg-linear-to-b from-transparent to-80%" />
    </div>
  );
}

function PlainTextBody({ body, variant }: { body: string; variant: 'mini' | 'default' }) {
  return (
    <span
      className={cn('min-h-4 whitespace-pre-wrap text-xs font-normal text-foreground-950', {
        'line-clamp-3': variant === 'mini',
      })}
      title={variant === 'mini' ? body : undefined}
    >
      {body}
    </span>
  );
}

/**
 * ------------------------------------------------------------------
 * Novu card preview — walks the rendered `CardElement` tree and
 * renders each block with final styling (heading, buttons, image,
 * fields, styled link). This is the default preview tab and the
 * renderer used in the mini workflow-node floating preview so the
 * author always sees a faithful representation of what will ship,
 * instead of the flattened text fallback.
 * ------------------------------------------------------------------
 */
type CardElementLike = {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  children?: unknown[];
};

function NovuCardBody({ card }: { card: CardElementLike }) {
  const { title, subtitle, imageUrl, children } = card;
  const hasHeader = !!title || !!subtitle || !!imageUrl;
  const nodes = Array.isArray(children) ? children : [];
  const isStaticImage = !!imageUrl && !imageUrl.includes('{{');

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-md border border-neutral-100 bg-white p-2.5">
      {hasHeader && (
        <div className="flex items-start gap-2">
          {imageUrl && (
            <div className="size-8 shrink-0 overflow-hidden rounded-md border border-neutral-100 bg-bg-weak">
              {isStaticImage ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="size-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <RiImageLine className="size-3.5 text-text-soft" />
                </div>
              )}
            </div>
          )}
          <div className="flex min-w-0 flex-col">
            {title && <div className="text-sm font-semibold leading-snug text-foreground-950">{title}</div>}
            {subtitle && <div className="text-xs leading-snug text-foreground-600">{subtitle}</div>}
          </div>
        </div>
      )}
      {nodes.length > 0 && (
        <div className="flex flex-col gap-2">
          {nodes.map((node, idx) => (
            <NovuCardElement key={idx} node={node} />
          ))}
        </div>
      )}
    </div>
  );
}

function NovuCardElement({ node }: { node: unknown }) {
  if (!node || typeof node !== 'object') return null;
  const n = node as Record<string, unknown>;
  const type = n.type as string | undefined;

  switch (type) {
    case 'text': {
      const content = String(n.content ?? '');
      if (!content) return null;
      const style = n.style as 'bold' | 'plain' | 'muted' | undefined;

      if (style === 'bold') {
        return <div className="text-sm font-semibold leading-snug text-foreground-950">{content}</div>;
      }
      if (style === 'muted') {
        return <div className="whitespace-pre-wrap text-xs leading-relaxed text-foreground-600">{content}</div>;
      }

      return <div className="whitespace-pre-wrap text-xs leading-relaxed text-foreground-800">{content}</div>;
    }
    case 'divider':
      return <hr className="my-0.5 border-0 border-t border-neutral-100" />;
    case 'link': {
      const label = String(n.label ?? '');
      const url = String(n.url ?? '');
      if (!label && !url) return null;

      return (
        <a
          href={url || undefined}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 self-start text-xs font-medium text-primary-base underline decoration-primary-base/40 underline-offset-2 hover:decoration-primary-base"
          onClick={(e) => e.preventDefault()}
        >
          <RiLink className="size-3" />
          <span className="truncate">{label || url}</span>
          {url && <RiExternalLinkLine className="size-3 text-text-soft" />}
        </a>
      );
    }
    case 'image': {
      const url = n.url as string | undefined;
      if (!url) return null;
      const alt = (n.alt as string | undefined) ?? '';
      const isStatic = !url.includes('{{');

      return (
        <figure className="flex flex-col gap-1">
          {isStatic ? (
            <img
              src={url}
              alt={alt}
              className="max-h-48 w-full rounded-md border border-neutral-100 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="flex aspect-16/6 w-full items-center justify-center gap-1 rounded-md border border-dashed border-neutral-200 bg-bg-weak text-2xs text-text-soft">
              <RiImageLine className="size-4" />
              Dynamic image
            </div>
          )}
          {alt && <figcaption className="text-2xs text-foreground-600">{alt}</figcaption>}
        </figure>
      );
    }
    case 'fields': {
      const fields = Array.isArray(n.children) ? (n.children as Array<Record<string, unknown>>) : [];
      if (fields.length === 0) return null;

      return (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          {fields.map((field, idx) => (
            <div key={idx} className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-2xs font-medium uppercase tracking-wide text-foreground-400">
                {String(field.label ?? '')}
              </dt>
              <dd className="text-xs text-foreground-950">{String(field.value ?? '')}</dd>
            </div>
          ))}
        </dl>
      );
    }
    case 'actions': {
      const elements = Array.isArray(n.children) ? (n.children as Array<Record<string, unknown>>) : [];
      if (elements.length === 0) return null;

      return (
        <div className="flex flex-wrap gap-1.5">
          {elements.map((el, idx) => (
            <NovuCardActionButton key={idx} action={el} />
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}

function NovuCardActionButton({ action }: { action: Record<string, unknown> }) {
  const label = String(action.label ?? '');
  const style = action.style as 'primary' | 'danger' | 'default' | undefined;
  const kind = action.type as string | undefined;
  const variant = actionButtonVariant(style);

  return (
    <Button
      type="button"
      size="xs"
      variant={variant.variant}
      mode={variant.mode}
      onClick={(e) => e.preventDefault()}
      className="pointer-events-none"
      aria-disabled
    >
      <span className="inline-flex items-center gap-1">
        <span className="truncate">{label || 'Button'}</span>
        {kind === 'link-button' && <RiExternalLinkLine className="size-3 opacity-70" />}
      </span>
    </Button>
  );
}

function actionButtonVariant(style: 'primary' | 'danger' | 'default' | undefined) {
  switch (style) {
    case 'primary':
      return { variant: 'primary' as const, mode: 'filled' as const };
    case 'danger':
      return { variant: 'error' as const, mode: 'filled' as const };
    default:
      return { variant: 'secondary' as const, mode: 'outline' as const };
  }
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
      const fields = Array.isArray(block.fields) ? (block.fields as Array<{ text?: string }>) : null;
      if (fields && fields.length > 0) {
        return (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {fields.map((field, idx) => (
              <div key={idx} className="whitespace-pre-wrap text-foreground-800">
                {field.text ?? ''}
              </div>
            ))}
          </div>
        );
      }

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
            const style = el.style as 'primary' | 'danger' | undefined;
            const variant = actionButtonVariant(style ?? 'default');

            return (
              <Button
                key={idx}
                type="button"
                size="xs"
                variant={variant.variant}
                mode={variant.mode}
                className="pointer-events-none"
                aria-disabled
              >
                {label}
              </Button>
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
        <div className="text-2xs flex gap-2 text-foreground-400">
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
            const style = (action as Record<string, unknown>).style as 'positive' | 'destructive' | undefined;
            const mapped =
              style === 'positive' ? 'primary' : style === 'destructive' ? 'danger' : 'default';
            const variant = actionButtonVariant(mapped);

            return (
              <Button
                key={idx}
                type="button"
                size="xs"
                variant={variant.variant}
                mode={variant.mode}
                className="pointer-events-none"
                aria-disabled
              >
                {title}
              </Button>
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
