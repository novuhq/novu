import { ChannelTypeEnum, type ChatRenderOutput, type GeneratePreviewResponseDto } from '@novu/shared';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { Skeleton } from '@/components/primitives/skeleton';
import { AnnotatedOverrideJson } from '@/components/workflow-editor/steps/shared/provider-overrides/annotated-override-json';
import {
  PROVIDER_OVERRIDES_FIELD,
  type ProviderOverrides,
} from '@/components/workflow-editor/steps/shared/provider-overrides/content-source';
import {
  getMergedOverrideHint,
  useAnnotatedOverridePreview,
} from '@/components/workflow-editor/steps/shared/provider-overrides/override-preview';
import { ChatShellContent } from './chat-shell-content';
import { PlatformSelector } from './platform-selector';
import { useConfiguredChatProviders } from './use-configured-chat-providers';

type ChatBlockEditorPreviewProps = {
  isPreviewPending: boolean;
  previewData?: GeneratePreviewResponseDto;
};

function extractChatPreview(previewData?: GeneratePreviewResponseDto): ChatRenderOutput | undefined {
  const result = previewData?.result;

  return result?.type === ChannelTypeEnum.CHAT ? (result.preview as ChatRenderOutput) : undefined;
}

/**
 * Rich-chat preview (behind `IS_CHAT_BLOCK_EDITOR_ENABLED`). A provider dropdown scoped to the
 * environment's active chat integrations drives which shell renders. For the selected provider we
 * show its override preview when one is authored, otherwise the compiled card, otherwise the body.
 */
export function ChatBlockEditorPreview({ isPreviewPending, previewData }: ChatBlockEditorPreviewProps) {
  const { options, defaultProviderId } = useConfiguredChatProviders();
  const [selectedProviderId, setSelectedProviderId] = useState<string | undefined>();
  const { watch } = useFormContext();
  const providerOverrides = watch(PROVIDER_OVERRIDES_FIELD) as ProviderOverrides | undefined;

  const activeProviderId =
    selectedProviderId && options.some((option) => option.providerId === selectedProviderId)
      ? selectedProviderId
      : defaultProviderId;
  const activeOption = options.find((option) => option.providerId === activeProviderId);

  const preview = extractChatPreview(previewData);
  const card = preview?.card;
  const body = preview?.body ?? '';

  const hasOverride = !!providerOverrides && activeProviderId in providerOverrides;

  const annotatedPreview = useAnnotatedOverridePreview({
    body,
    providerId: hasOverride ? activeProviderId : undefined,
    formOverrides: providerOverrides,
    previewOverrides: preview?.providerOverrides,
  });

  const renderContent = () => {
    // An authored override always wins over the shell/card/body — including the
    // "preview not supported" state for providers without a dedicated shell.
    if (hasOverride) {
      if (isPreviewPending || !annotatedPreview) {
        return <Skeleton className="h-24 w-full shrink-0 rounded-md" />;
      }

      const displayName = activeOption?.displayName ?? activeProviderId;

      return (
        <div className="flex min-h-0 flex-col gap-1.5">
          <span className="text-foreground-600 text-label-2xs font-medium uppercase tracking-wide">
            Merged override fields
          </span>
          <AnnotatedOverrideJson {...annotatedPreview} />
          <div className="text-foreground-400 text-label-2xs min-h-4 shrink-0">
            {getMergedOverrideHint({
              hasOverride: annotatedPreview.hasOverride,
              defaultContentKey: annotatedPreview.defaultContentKey,
              body,
              providerId: activeProviderId,
              displayName,
            })}
          </div>
        </div>
      );
    }

    return (
      <ChatShellContent
        providerId={activeProviderId}
        variant="default"
        card={card}
        body={body}
        isPreviewPending={isPreviewPending}
      />
    );
  };

  return (
    <div className="-m-3 flex h-full min-h-0 flex-col">
      <PlatformSelector activeOption={activeOption} options={options} onSelect={setSelectedProviderId} />
      <div className="flex min-h-0 flex-1 flex-col p-3">{renderContent()}</div>
    </div>
  );
}
