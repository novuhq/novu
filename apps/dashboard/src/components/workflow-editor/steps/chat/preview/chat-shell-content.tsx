import { type CardElement, isMailyChatBody } from '@novu/shared';
import { RiCloseCircleLine } from 'react-icons/ri';

import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { cn } from '@/utils/ui';
import { getChatPreviewSkin } from './shells/shell-registry';
import type { ChatShellVariant } from './shells/shell-types';
import { getProviderDisplayName } from './use-configured-chat-providers';

const SKELETON_BAR = 'bg-gradient-to-r from-[#f1efef] via-[#f9f8f8] to-[#f9f8f8]/75';

type ChatShellContentProps = {
  providerId: string;
  variant: ChatShellVariant;
  card?: CardElement;
  body?: string;
  isPreviewPending?: boolean;
};

/**
 * Neutral empty state for providers without a dedicated shell. Rather than faking a platform's
 * chrome we show a skeleton illustration and tell the user the preview is unavailable, nudging
 * them to send a test to verify rendering on the platform itself.
 */
function UnsupportedPreview({ providerId }: { providerId: string }) {
  const displayName = getProviderDisplayName(providerId);

  return (
    <div className="flex min-h-32 flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex flex-col items-center">
        <div className="border-stroke-soft flex w-34 items-center rounded-lg border border-dashed p-1">
          <div className="bg-bg-white border-stroke-soft flex flex-1 items-center justify-center rounded-md border p-3">
            <div className="relative size-4 shrink-0">
              <ProviderIcon
                providerId={providerId}
                providerDisplayName={displayName}
                className="size-4 opacity-60 grayscale"
              />
              <span className="bg-bg-white absolute -bottom-1 -right-1 flex items-center justify-center rounded-full">
                <RiCloseCircleLine className="text-text-soft size-3" />
              </span>
            </div>
          </div>
        </div>
        <div className="border-stroke-soft h-6 w-px border-l" />
        <div className="border-stroke-weak rounded-lg border p-1">
          <div className="bg-bg-white border-stroke-soft flex w-49.25 items-center gap-1 rounded border p-2">
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex items-center gap-1">
                <div className="bg-bg-weak size-3 shrink-0 rounded-full" />
                <div className={cn('h-2 w-11 rounded-sm', SKELETON_BAR)} />
              </div>
              <div className="flex flex-wrap gap-x-0.5 gap-y-0.75">
                <div className={cn('h-1.5 w-19.25 rounded-md', SKELETON_BAR)} />
                <div className={cn('h-1.5 flex-1 rounded-md', SKELETON_BAR)} />
                <div className={cn('h-1.5 min-w-12.5 flex-1 rounded-md', SKELETON_BAR)} />
                <div className={cn('h-1.5 w-22.75 rounded-md', SKELETON_BAR)} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex max-w-50.5 flex-col gap-1">
        <p className="text-text-soft text-xs font-normal leading-4 mb-2">Preview not supported</p>
        <p className="text-text-soft text-xs font-normal leading-4">
          Send a test to see how this message renders in <span className="text-text-sub">{displayName}</span>.
        </p>
      </div>
    </div>
  );
}

/**
 * Renders the body of a chat message inside the provider-specific shell chrome. Precedence:
 * compiled `card` first, then the loading skeleton, then a neutral placeholder for a Maily/JSON
 * body without a compiled card, and finally the plain markdown body text. Providers without a
 * dedicated shell show a "preview not supported" state instead.
 */
export function ChatShellContent({
  providerId,
  variant,
  card,
  body = '',
  isPreviewPending = false,
}: ChatShellContentProps) {
  const { Shell, ContentSkeleton, isSupported } = getChatPreviewSkin(providerId);

  if (!isSupported && variant !== 'mini') {
    return <UnsupportedPreview providerId={providerId} />;
  }

  if (card) {
    return <Shell card={card} variant={variant} />;
  }

  if (isPreviewPending) {
    return (
      <Shell variant={variant}>
        <ContentSkeleton />
      </Shell>
    );
  }

  return (
    <Shell variant={variant}>
      <span
        className={cn('text-foreground-950 min-h-4 text-xs font-normal min-w-0 whitespace-pre-wrap wrap-anywhere', {
          'line-clamp-3': variant === 'mini',
        })}
        title={variant === 'mini' ? body : undefined}
      >
        {body}
      </span>
    </Shell>
  );
}
