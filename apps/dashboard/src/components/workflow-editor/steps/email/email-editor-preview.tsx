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
      <div className="flex h-full flex-col">
        <EmailTabsSection className="flex h-full flex-col gap-3">
          <div className={'flex items-center justify-between gap-2.5 text-sm font-medium'}>
            <div className="flex items-center gap-2.5">
              <span>Email template editor</span>
            </div>
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
          </div>
          <div className="flex flex-1 flex-col gap-2 rounded-xl border border-neutral-100 p-2">
            <EmailPreviewHeader />
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
                        <EmailTabsSection className="-mx-[2px] -my-[3px] px-7 py-2">
                          <EmailPreviewSubject subject={previewData.result.preview.subject} />
                        </EmailTabsSection>
                        <Separator className="before:bg-neutral-100" />
                        <EmailTabsSection className="flex-1 overflow-auto bg-neutral-50 pl-16 pr-16 pt-5">
                          <EmailPreviewBody
                            body={previewData.result.preview.body}
                            className="bg-background rounded-lg"
                          />
                        </EmailTabsSection>
                      </TabsContent>
                    </>
                  ) : (
                    <div className="p-6">No preview available</div>
                  )}
                </>
              )}
            </div>
          </div>
          <EmailTabsSection>
            <ConfigurePreviewAccordion
              editorValue={editorValue}
              setEditorValue={setEditorValue}
              onUpdate={previewStep}
            />
          </EmailTabsSection>
        </EmailTabsSection>
      </div>
    </Tabs>
  );
};
