import {
  ChannelTypeEnum,
  type ChatRenderOutput,
  FeatureFlagsKeysEnum,
  type GeneratePreviewResponseDto,
} from '@novu/shared';
import { type ReactNode, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { Skeleton } from '@/components/primitives/skeleton';
import { AnnotatedOverrideJson } from '@/components/workflow-editor/steps/shared/provider-overrides/annotated-override-json';
import {
  type ContentSource,
  DEFAULT_CONTENT_SOURCE,
  PROVIDER_OVERRIDES_FIELD,
  type ProviderOverrides,
} from '@/components/workflow-editor/steps/shared/provider-overrides/content-source';
import { useOptionalContentSource } from '@/components/workflow-editor/steps/shared/provider-overrides/content-source-context';
import {
  getMergedOverrideHint,
  useAnnotatedOverridePreview,
} from '@/components/workflow-editor/steps/shared/provider-overrides/override-preview';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { buildRoute, ROUTES } from '@/utils/routes';
import { ChatShellContent } from './chat-shell-content';
import { PlatformSelector } from './platform-selector';
import { PreviewInfoHint } from './preview-info-hint';
import { PreviewWarningBanner } from './preview-warning-banner';
import { isChatPreviewSupported } from './shells/shell-registry';
import {
  type ChatPreviewProviderOption,
  DEFAULT_PREVIEW_PROVIDER_ID,
  useConfiguredChatProviders,
} from './use-configured-chat-providers';

function contentSourceToPreviewProviderId(source: ContentSource): string {
  return source === DEFAULT_CONTENT_SOURCE ? DEFAULT_PREVIEW_PROVIDER_ID : source;
}

function previewProviderIdToContentSource(providerId: string): ContentSource {
  return providerId === DEFAULT_PREVIEW_PROVIDER_ID ? DEFAULT_CONTENT_SOURCE : (providerId as ContentSource);
}

type ChatBlockEditorPreviewProps = {
  isPreviewPending: boolean;
  previewData?: GeneratePreviewResponseDto;
};

function extractChatPreview(previewData?: GeneratePreviewResponseDto): ChatRenderOutput | undefined {
  const result = previewData?.result;

  return result?.type === ChannelTypeEnum.CHAT ? (result.preview as ChatRenderOutput) : undefined;
}

type ShellBodyProps = {
  providerId: string;
  card?: ChatRenderOutput['card'];
  body: string;
  isPreviewPending: boolean;
  isPreviewSupported: boolean;
};

function ShellBody({ providerId, card, body, isPreviewPending, isPreviewSupported }: ShellBodyProps) {
  if (!isPreviewSupported) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <ChatShellContent
          providerId={providerId}
          variant="default"
          card={card}
          body={body}
          isPreviewPending={isPreviewPending}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <ChatShellContent
        providerId={providerId}
        variant="default"
        card={card}
        body={body}
        isPreviewPending={isPreviewPending}
      />
      <PreviewInfoHint />
    </div>
  );
}

type PreviewFrameProps = {
  activeOption?: ChatPreviewProviderOption;
  options: ChatPreviewProviderOption[];
  onSelectProvider: (providerId: string) => void;
  warningBanner: ReactNode;
  children: ReactNode;
};

function PreviewFrame({ activeOption, options, onSelectProvider, warningBanner, children }: PreviewFrameProps) {
  return (
    <div className="-m-3 flex h-full min-h-0 flex-col">
      <PlatformSelector activeOption={activeOption} options={options} onSelect={onSelectProvider} />
      {warningBanner}
      <div className="flex min-h-0 flex-1 flex-col p-3">{children}</div>
    </div>
  );
}

function usePreviewWarningBanner({
  activeProviderId,
  activeOption,
  hasConnectedIntegrations,
  hideBanner,
}: {
  activeProviderId: string;
  activeOption?: ChatPreviewProviderOption;
  hasConnectedIntegrations: boolean;
  hideBanner?: boolean;
}) {
  const navigate = useNavigate();
  const isDefaultPreview = activeProviderId === DEFAULT_PREVIEW_PROVIDER_ID;
  const showProviderWarning = !isDefaultPreview && activeOption?.isConnected === false;

  const handleConnect = () => {
    if (isDefaultPreview) {
      void navigate(ROUTES.INTEGRATIONS_CONNECT);

      return;
    }

    void navigate(buildRoute(ROUTES.INTEGRATIONS_CONNECT_PROVIDER, { providerId: activeProviderId }));
  };

  if (hideBanner) {
    return null;
  }

  if (isDefaultPreview && !hasConnectedIntegrations) {
    return (
      <PreviewWarningBanner
        message="Formatting may vary across providers."
        ctaLabel="Connect a provider →"
        onConnect={handleConnect}
      />
    );
  }

  if (showProviderWarning) {
    return (
      <PreviewWarningBanner
        message="No integration available for this provider."
        ctaLabel={`Connect ${activeOption?.displayName ?? activeProviderId} →`}
        onConnect={handleConnect}
      />
    );
  }

  return null;
}

/**
 * Rich preview without provider-override coupling. Platform selection is local; the
 * `providerOverrides` form field is never watched.
 */
function ChatBlockEditorPreviewBase({ isPreviewPending, previewData }: ChatBlockEditorPreviewProps) {
  const { options, defaultProviderId, isLoading } = useConfiguredChatProviders();
  const [selectedProviderId, setSelectedProviderId] = useState<string | undefined>();

  const activeProviderId =
    selectedProviderId && options.some((option) => option.providerId === selectedProviderId)
      ? selectedProviderId
      : defaultProviderId;
  const activeOption = options.find((option) => option.providerId === activeProviderId);

  const preview = extractChatPreview(previewData);
  const isPreviewSupported = isChatPreviewSupported(activeProviderId);
  const hasConnectedIntegrations = options.some(
    (option) => option.providerId !== DEFAULT_PREVIEW_PROVIDER_ID && option.isConnected
  );

  const warningBanner = usePreviewWarningBanner({
    activeProviderId,
    activeOption,
    hasConnectedIntegrations,
    hideBanner: isLoading,
  });

  return (
    <PreviewFrame
      activeOption={activeOption}
      options={options}
      onSelectProvider={setSelectedProviderId}
      warningBanner={warningBanner}
    >
      <ShellBody
        providerId={activeProviderId}
        card={preview?.card}
        body={preview?.body ?? ''}
        isPreviewPending={isPreviewPending}
        isPreviewSupported={isPreviewSupported}
      />
    </PreviewFrame>
  );
}

/**
 * Rich preview with editor content-source sync and override JSON. Split out so the
 * overrides-flag-off path never subscribes to `providerOverrides` or `ContentSourceContext`.
 */
function ChatBlockEditorPreviewWithOverrides({ isPreviewPending, previewData }: ChatBlockEditorPreviewProps) {
  const { options, defaultProviderId, isLoading } = useConfiguredChatProviders();
  const contentSource = useOptionalContentSource();
  const { watch } = useFormContext();
  const providerOverrides = watch(PROVIDER_OVERRIDES_FIELD) as ProviderOverrides | undefined;

  const resolvedProviderId = contentSource
    ? contentSourceToPreviewProviderId(contentSource.previewSource)
    : defaultProviderId;
  const activeProviderId = options.some((option) => option.providerId === resolvedProviderId)
    ? resolvedProviderId
    : defaultProviderId;
  const activeOption = options.find((option) => option.providerId === activeProviderId);

  const preview = extractChatPreview(previewData);
  const body = preview?.body ?? '';
  const isPreviewSupported = isChatPreviewSupported(activeProviderId);
  const hasOverride = !!providerOverrides && activeProviderId in providerOverrides;
  const hasConnectedIntegrations = options.some(
    (option) => option.providerId !== DEFAULT_PREVIEW_PROVIDER_ID && option.isConnected
  );

  const annotatedPreview = useAnnotatedOverridePreview({
    body,
    providerId: hasOverride ? activeProviderId : undefined,
    formOverrides: providerOverrides,
    previewOverrides: preview?.providerOverrides,
  });

  const warningBanner = usePreviewWarningBanner({
    activeProviderId,
    activeOption,
    hasConnectedIntegrations,
    hideBanner: isLoading || hasOverride,
  });

  const handleSelectProvider = (providerId: string) => {
    contentSource?.setPreviewSource(previewProviderIdToContentSource(providerId));
  };

  const renderContent = () => {
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
      <ShellBody
        providerId={activeProviderId}
        card={preview?.card}
        body={body}
        isPreviewPending={isPreviewPending}
        isPreviewSupported={isPreviewSupported}
      />
    );
  };

  return (
    <PreviewFrame
      activeOption={activeOption}
      options={options}
      onSelectProvider={handleSelectProvider}
      warningBanner={warningBanner}
    >
      {renderContent()}
    </PreviewFrame>
  );
}

/**
 * Rich-chat preview. Only mounted when `IS_CHAT_BLOCK_EDITOR_ENABLED` is on
 * (see `ChatPreviewPanel`). When `IS_CHAT_PROVIDER_OVERRIDES_ENABLED` is also on, platform
 * selection syncs with the editor content-source dropdown and authored overrides win over the shell.
 */
export function ChatBlockEditorPreview(props: ChatBlockEditorPreviewProps) {
  const areProviderOverridesEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CHAT_PROVIDER_OVERRIDES_ENABLED);

  if (areProviderOverridesEnabled) {
    return <ChatBlockEditorPreviewWithOverrides {...props} />;
  }

  return <ChatBlockEditorPreviewBase {...props} />;
}
