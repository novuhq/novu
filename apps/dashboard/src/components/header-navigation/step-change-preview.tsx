import {
  ChannelTypeEnum,
  type EmailRenderOutput,
  type GeneratePreviewResponseDto,
  type IEnvironment,
  type PreviewError,
  ResourceOriginEnum,
} from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { previewStep } from '@/api/steps';
import { StepTypeEnum } from '@/utils/enums';
import { QueryKeys } from '@/utils/query-keys';
import { Skeleton } from '../primitives/skeleton';
import { ChatPreview } from '../workflow-editor/steps/chat/chat-preview';
import { EmailPreviewBody } from '../workflow-editor/steps/email/email-preview';
import { InboxPreview } from '../workflow-editor/steps/in-app/inbox-preview';
import { PushPreview } from '../workflow-editor/steps/push/push-preview';
import { SmsPreview } from '../workflow-editor/steps/sms/sms-preview';
import { ToolPreviewMini } from '../workflow-editor/steps/tool/tool-preview';

type StepPreviewPaneProps = {
  environment: IEnvironment | undefined;
  environmentName: string;
  workflowId: string;
  stepId: string;
  stepType: StepTypeEnum;
  /** False when the step doesn't exist in this environment (added or deleted by the publish). */
  present: boolean;
};

export function StepPreviewPane({ present, environmentName, ...rest }: StepPreviewPaneProps) {
  if (!present) {
    return <PreviewMessage>Not in {environmentName}</PreviewMessage>;
  }

  return <EnvironmentStepPreview {...rest} />;
}

function EnvironmentStepPreview({
  environment,
  workflowId,
  stepId,
  stepType,
}: Omit<StepPreviewPaneProps, 'present' | 'environmentName'>) {
  // An empty request renders the controls stored in that environment, which is what the diff compares.
  const { data, isPending, isError } = useQuery({
    queryKey: [QueryKeys.previewStep, 'publish', environment?._id, workflowId, stepId],
    queryFn: ({ signal }) => {
      if (!environment) throw new Error('Environment is not loaded yet');

      return previewStep({ environment, workflowSlug: workflowId, stepSlug: stepId, previewData: {}, signal });
    },
    enabled: Boolean(environment),
  });

  if (isError) {
    return <PreviewMessage>Couldn't load the preview</PreviewMessage>;
  }

  if ((data?.result as { error?: PreviewError } | undefined)?.error) {
    return <PreviewMessage>Preview unavailable for this step</PreviewMessage>;
  }

  return (
    <div className="max-h-[400px] min-w-0 flex-1 self-stretch overflow-auto rounded-md border border-stroke-soft bg-bg-white">
      <StepPreviewContent stepType={stepType} previewData={data} isPending={isPending} />
    </div>
  );
}

function StepPreviewContent({
  stepType,
  previewData,
  isPending,
}: {
  stepType: StepTypeEnum;
  previewData: GeneratePreviewResponseDto | undefined;
  isPending: boolean;
}) {
  switch (stepType) {
    case StepTypeEnum.EMAIL:
      return <EmailStepPreview previewData={previewData} isPending={isPending} />;
    case StepTypeEnum.IN_APP:
      return (
        <div className="p-3">
          <InboxPreview previewData={previewData} isPreviewPending={isPending} showBell={false} />
        </div>
      );
    case StepTypeEnum.SMS:
      return (
        <div className="p-3">
          <SmsPreview previewData={previewData} isPreviewPending={isPending} />
        </div>
      );
    case StepTypeEnum.PUSH:
      return (
        <div className="p-3">
          <PushPreview previewData={previewData} isPreviewPending={isPending} />
        </div>
      );
    case StepTypeEnum.CHAT:
      return (
        <div className="p-3">
          <ChatPreview previewData={previewData} isPreviewPending={isPending} />
        </div>
      );
    case StepTypeEnum.TOOL:
      return (
        <div className="p-3">
          <ToolPreviewMini previewData={previewData} isPreviewPending={isPending} />
        </div>
      );
    case StepTypeEnum.DIGEST:
    case StepTypeEnum.TRIGGER:
    case StepTypeEnum.DELAY:
    case StepTypeEnum.THROTTLE:
    case StepTypeEnum.CUSTOM:
    case StepTypeEnum.HTTP_REQUEST:
      return null;
    default: {
      const _exhaustiveCheck: never = stepType;

      return _exhaustiveCheck;
    }
  }
}

function EmailStepPreview({
  previewData,
  isPending,
}: {
  previewData: GeneratePreviewResponseDto | undefined;
  isPending: boolean;
}) {
  if (isPending) {
    return (
      <div className="flex flex-col gap-3 p-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const preview =
    previewData?.result.type === ChannelTypeEnum.EMAIL ? (previewData.result.preview as EmailRenderOutput) : undefined;

  if (!preview?.body) {
    return <p className="p-3 text-paragraph-xs text-text-soft">No preview available</p>;
  }

  const sender = preview.from?.name || preview.from?.email;

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-0.5 border-b border-stroke-weak px-3 py-2">
        {sender && <span className="truncate text-label-xs text-text-soft">{sender}</span>}
        <span className="text-label-sm text-text-strong">{preview.subject}</span>
      </div>
      <EmailPreviewBody body={preview.body} resourceOrigin={ResourceOriginEnum.NOVU_CLOUD} readOnlyBranding />
    </div>
  );
}

function PreviewMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-24 min-w-0 flex-1 items-center justify-center self-stretch rounded-md border border-stroke-soft bg-bg-white p-3">
      <span className="text-center text-paragraph-xs text-text-soft">{children}</span>
    </div>
  );
}
