import { SmsPhone } from '@/components/workflow-editor/steps/sms/sms-phone';
import { ChannelTypeEnum, SmsRenderOutput, type GeneratePreviewResponseDto } from '@novu/shared';
import { ReactNode } from 'react';

const SmsPreviewContainer = ({ children }: { children: ReactNode }) => {
  return <div className="flex items-center justify-center">{children}</div>;
};

export const SmsPreview = ({
  isPreviewPending,
  previewData,
}: {
  isPreviewPending: boolean;
  previewData?: GeneratePreviewResponseDto;
}) => {
  const previewResult = previewData?.result;
  const isValidSmsPreview =
    previewResult && previewResult.type === ChannelTypeEnum.SMS && previewResult.preview.body.length > 0;
  const body = isValidSmsPreview ? ((previewData?.result.preview as SmsRenderOutput)?.body ?? '') : '';

  if (isPreviewPending || previewData === undefined) {
    return (
      <SmsPreviewContainer>
        <SmsPhone smsBody="" isLoading={isPreviewPending} />
      </SmsPreviewContainer>
    );
  }

  return (
    <SmsPreviewContainer>
      <SmsPhone smsBody={body} />
    </SmsPreviewContainer>
  );
};
