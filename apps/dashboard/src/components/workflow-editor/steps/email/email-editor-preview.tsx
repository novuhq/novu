import { ChannelTypeEnum, GeneratePreviewResponseDto } from '@novu/shared';
import { useState } from 'react';
import { RiMacLine, RiSmartphoneFill } from 'react-icons/ri';

import { Separator } from '@/components/primitives/separator';
import { Skeleton } from '@/components/primitives/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import {
  EmailPreviewBody,
  EmailPreviewBodyMobile,
  EmailPreviewContentMobile,
  EmailPreviewHeader,
  EmailPreviewSubject,
  EmailPreviewSubjectMobile,
} from '@/components/workflow-editor/steps/email/email-preview';
import { EmailTabsSection } from '@/components/workflow-editor/steps/email/email-tabs-section';
import { TabsContent } from '@radix-ui/react-tabs';
import { ConfigurePreviewAccordion } from '../shared/configure-preview-accordion';

type EmailEditorPreviewProps = {
  editorValue: string;
  setEditorValue: (value: string) => Error | null;
  previewStep: () => void;
  previewData?: GeneratePreviewResponseDto;
  isPreviewPending: boolean;
};

export const EmailEditorPreview = ({
  editorValue,
  setEditorValue,
  previewStep,
  previewData,
  isPreviewPending = false,
}: EmailEditorPreviewProps) => {
  const [activeTab, setActiveTab] = useState('desktop');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <EmailTabsSection className="flex w-full items-center justify-between">
        <EmailPreviewHeader />
        <div>
          <TabsList>
            <TabsTrigger value="mobile">
              <RiSmartphoneFill className="size-4" />
            </TabsTrigger>
            <TabsTrigger value="desktop">
              <RiMacLine className="size-4" />
            </TabsTrigger>
          </TabsList>
        </div>
      </EmailTabsSection>
      <div className="relative flex flex-col">
        {isPreviewPending ? (
          <div className="flex flex-col">
            <EmailTabsSection className="py-2">
              <Skeleton className="h-6 w-full" />
            </EmailTabsSection>
            <Separator className="before:bg-neutral-100" />
            <EmailTabsSection>
              <Skeleton className="h-96 w-full" />
            </EmailTabsSection>
          </div>
        ) : (
          <>
            {previewData?.result?.type == ChannelTypeEnum.EMAIL ? (
              <>
                <TabsContent value="mobile">
                  <div className="w-full bg-neutral-100">
                    <EmailPreviewContentMobile className="mx-auto">
                      <EmailPreviewSubjectMobile subject={previewData.result.preview.subject} />
                      <EmailPreviewBodyMobile body={previewData.result.preview.body} />
                    </EmailPreviewContentMobile>
                  </div>
                </TabsContent>
                <TabsContent value="desktop">
                  <EmailPreviewSubject subject={previewData.result.preview.subject} />
                  <Separator className="before:bg-neutral-100" />
                  <EmailPreviewBody body={previewData.result.preview.body} className="bg-background rounded-lg" />
                </TabsContent>
              </>
            ) : (
              <div className="p-6">No preview available</div>
            )}
          </>
        )}
        <EmailTabsSection>
          <ConfigurePreviewAccordion editorValue={editorValue} setEditorValue={setEditorValue} onUpdate={previewStep} />
        </EmailTabsSection>
      </div>
    </Tabs>
  );
};
