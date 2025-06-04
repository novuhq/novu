import { ReactNode } from 'react';
import { ChannelTypeEnum, FeatureFlagsKeysEnum, type GeneratePreviewResponseDto } from '@novu/shared';
import {
  InAppPreview,
  InAppPreviewActions,
  InAppPreviewAvatar,
  InAppPreviewBell,
  InAppPreviewBody,
  InAppPreviewHeader,
  InAppPreviewNotification,
  InAppPreviewNotificationContent,
  InAppPreviewPrimaryAction,
  InAppPreviewSecondaryAction,
  InAppPreviewSubject,
} from '@/components/workflow-editor/in-app-preview';
import { useFeatureFlag } from '../../../../hooks/use-feature-flag';
import { cn } from '../../../../utils/ui';

const InboxPreviewContainer = ({ children, className }: { children: ReactNode; className?: string }) => {
  const isV2TemplateEditorEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_TEMPLATE_EDITOR_ENABLED);
  return (
    <div className={cn('relative my-2', className)}>
      <div className="relative mx-auto max-w-sm">
        <InAppPreviewBell />
        <InAppPreview className={cn('min-h-64', isV2TemplateEditorEnabled ? 'bg-bg-white' : '')}>
          <InAppPreviewHeader />
          {children}
        </InAppPreview>
      </div>
      <div
        className={cn(
          'absolute -bottom-3 h-16 w-full bg-gradient-to-b from-transparent to-80%',
          isV2TemplateEditorEnabled ? 'to-bg-weak' : 'to-background'
        )}
      />
    </div>
  );
};

export const InboxPreview = ({
  isPreviewPending,
  previewData,
}: {
  isPreviewPending: boolean;
  previewData?: GeneratePreviewResponseDto;
}) => {
  const isV2TemplateEditorEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_TEMPLATE_EDITOR_ENABLED);
  const previewResult = previewData?.result;

  if (isPreviewPending || previewData === undefined) {
    return (
      <InboxPreviewContainer>
        <InAppPreviewNotification>
          <InAppPreviewAvatar isPending />
          <InAppPreviewNotificationContent>
            <InAppPreviewSubject isPending />
            <InAppPreviewBody isPending className="line-clamp-6" />
            <InAppPreviewActions>
              <InAppPreviewPrimaryAction isPending />
              <InAppPreviewSecondaryAction isPending />
            </InAppPreviewActions>
          </InAppPreviewNotificationContent>
        </InAppPreviewNotification>
      </InboxPreviewContainer>
    );
  }

  if (previewResult?.type === undefined || previewResult?.type !== ChannelTypeEnum.IN_APP) {
    return (
      <InboxPreviewContainer>
        <InAppPreviewNotification className="flex-1 items-center">
          <InAppPreviewNotificationContent className="my-auto">
            <InAppPreviewBody className="mb-4 text-center">No preview available</InAppPreviewBody>
          </InAppPreviewNotificationContent>
        </InAppPreviewNotification>
      </InboxPreviewContainer>
    );
  }

  const preview = previewResult.preview;

  return (
    <InboxPreviewContainer>
      <InAppPreviewNotification>
        <InAppPreviewAvatar src={preview?.avatar} />
        <InAppPreviewNotificationContent>
          <InAppPreviewSubject>{preview?.subject}</InAppPreviewSubject>
          <InAppPreviewBody className="line-clamp-6">{preview?.body}</InAppPreviewBody>
          <InAppPreviewActions>
            <InAppPreviewPrimaryAction>{preview?.primaryAction?.label}</InAppPreviewPrimaryAction>
            <InAppPreviewSecondaryAction>{preview?.secondaryAction?.label}</InAppPreviewSecondaryAction>
          </InAppPreviewActions>
        </InAppPreviewNotificationContent>
      </InAppPreviewNotification>
    </InboxPreviewContainer>
  );
};
