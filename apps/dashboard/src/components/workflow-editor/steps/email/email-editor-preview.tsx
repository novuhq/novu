import { ChannelTypeEnum, GeneratePreviewResponseDto } from '@novu/shared';
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
}: EmailEditorPreviewProps) => {
  const [activeTab, setActiveTab] = useState('desktop');

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
      {/* <EmailTabsSection className="flex w-full items-center justify-between"> */}
      <div className="flex w-full items-center justify-between px-4 pb-0 pt-4">
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
      </div>
      <div className="flex flex-col">
        <AnimatePresence mode="wait">
          {isPreviewPending ? (
            <motion.div
              key="loading"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={fadeVariants}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <div className="flex flex-col">
                <div className={cn('border-b px-4 py-1.5')}>
                  <Skeleton className="h-8 w-full" />
                </div>
                <EmailTabsSection className="bg-neutral-50 py-4">
                  <Skeleton className="mx-auto h-96 max-w-[600px] rounded-lg" />
                </EmailTabsSection>
              </div>
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
        <ConfigurePreviewAccordion editorValue={editorValue} setEditorValue={setEditorValue} onUpdate={previewStep} />
      </div>
    </Tabs>
  );
};
