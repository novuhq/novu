import { ChannelTypeEnum, GeneratePreviewResponseDto, type WorkflowResponseDto } from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { cn } from '@/utils/ui';
import { RiMacLine, RiSmartphoneFill } from 'react-icons/ri';

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
  workflow?: WorkflowResponseDto;
};

const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const EmailEditorPreview = ({
  editorValue,
  setEditorValue,
  previewStep,
  previewData,
  isPreviewPending = false,
  workflow,
}: EmailEditorPreviewProps) => {
  const [previewType, setPreviewType] = useState<'mobile' | 'desktop'>('desktop');

  return (
    <Tabs value={previewType} onValueChange={(value) => setPreviewType(value as 'mobile' | 'desktop')}>
      <EmailTabsSection>
        <div className="flex items-center justify-between gap-2.5 px-4 py-3 text-sm font-medium">
          <span>Email template editor</span>
          <TabsList className="w-min">
            <TabsTrigger value="desktop" className="gap-1.5">
              <RiMacLine className="size-4" />
              <span>Desktop</span>
            </TabsTrigger>
            <TabsTrigger value="mobile" className="gap-1.5">
              <RiSmartphoneFill className="size-4" />
              <span>Mobile</span>
            </TabsTrigger>
          </TabsList>
        </div>
      </EmailTabsSection>
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {isPreviewPending ? (
            <motion.div
              key="loading"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={fadeVariants}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <TabsContent value="mobile">
                <div className="w-full bg-neutral-100">
                  <EmailPreviewContentMobile className="mx-auto">
                    <EmailPreviewSubjectMobile subject="Loading...">
                      <Skeleton className="h-4 w-3/4" />
                    </EmailPreviewSubjectMobile>
                    <div className="bg-background rounded-lg p-4">
                      <Skeleton className="mb-2 h-4 w-full" />
                      <Skeleton className="mb-2 h-4 w-5/6" />
                      <Skeleton className="h-4 w-4/6" />
                    </div>
                  </EmailPreviewContentMobile>
                </div>
              </TabsContent>
              <TabsContent value="desktop" className="h-full">
                <div className="border-b px-2">
                  <EmailPreviewHeader>
                    <Skeleton className="h-4 w-1/2" />
                  </EmailPreviewHeader>
                </div>
                <div className="bg-neutral-50 px-16 py-8">
                  <div className="bg-background rounded-lg p-8">
                    <Skeleton className="mb-4 h-6 w-3/4" />
                    <Skeleton className="mb-2 h-4 w-full" />
                    <Skeleton className="mb-2 h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                  </div>
                </div>
              </TabsContent>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={fadeVariants}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
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
                  <TabsContent value="desktop" className="h-full">
                    <div className="border-b px-2">
                      <EmailPreviewSubject subject={previewData.result.preview.subject} />
                    </div>
                    <div className="bg-neutral-50 px-16 py-8">
                      <EmailPreviewBody body={previewData.result.preview.body} className="bg-background rounded-lg" />
                    </div>
                  </TabsContent>
                </>
              ) : (
                <div className="p-6">No preview available</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className={cn('px-4 py-3')}>
        <ConfigurePreviewAccordion
          editorValue={editorValue}
          setEditorValue={setEditorValue}
          onUpdate={previewStep}
          workflow={workflow}
        />
      </div>
    </Tabs>
  );
};
