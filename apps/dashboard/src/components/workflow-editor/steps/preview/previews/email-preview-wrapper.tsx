import { ChannelTypeEnum, ResourceOriginEnum } from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { RiMacLine, RiSmartphoneFill } from 'react-icons/ri';
import { Skeleton } from '@/components/primitives/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import {
  EmailPreviewBody,
  EmailPreviewBodyMobile,
  EmailPreviewContentMobile,
  EmailPreviewHeader,
  EmailPreviewSubject,
  EmailPreviewSubjectMobile,
} from '@/components/workflow-editor/steps/email/email-preview';
import { EmailTabsSection } from '@/components/workflow-editor/steps/email/email-tabs-section';
import { cn } from '@/utils/ui';

type EmailCorePreviewProps = {
  previewData: any;
  isPreviewPending: boolean;
  isCustomHtmlEditor?: boolean;
  resourceOrigin: ResourceOriginEnum;
};

const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export function EmailCorePreview({
  previewData,
  isPreviewPending,
  isCustomHtmlEditor,
  resourceOrigin,
}: EmailCorePreviewProps) {
  const [activeTab, setActiveTab] = useState('desktop');

  // Memoize the preview content extraction to avoid recalculating on every render
  const emailPreviewContent = useMemo(() => {
    if (!previewData?.result || previewData.result.type !== ChannelTypeEnum.EMAIL) {
      return null;
    }

    return {
      subject: previewData.result.preview?.subject || '',
      body: previewData.result.preview?.body || '',
    };
  }, [previewData?.result]);

  // Memoize the loading skeleton to avoid recreating it
  const loadingSkeleton = useMemo(
    () => (
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
    ),
    []
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-bg-weak h-full">
      <div className="">
        <div className="bg-bg-white overflow-auto rounded-lg border border-neutral-200">
          <div className="flex w-full items-center justify-between px-3 pb-0 pt-3">
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
                loadingSkeleton
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
                  {emailPreviewContent ? (
                    <>
                      <TabsContent value="mobile">
                        <div className="w-full bg-neutral-100">
                          <EmailPreviewContentMobile className="mx-auto">
                            <EmailPreviewSubjectMobile subject={emailPreviewContent.subject} />
                            <EmailPreviewBodyMobile body={emailPreviewContent.body} resourceOrigin={resourceOrigin} />
                          </EmailPreviewContentMobile>
                        </div>
                      </TabsContent>
                      <TabsContent value="desktop" className="h-full">
                        <div className="border-b px-2">
                          <EmailPreviewSubject subject={emailPreviewContent.subject} />
                        </div>
                        <div className={cn(isCustomHtmlEditor ? '' : 'bg-neutral-50 px-16 py-8')}>
                          <EmailPreviewBody
                            body={emailPreviewContent.body}
                            resourceOrigin={resourceOrigin}
                            className={isCustomHtmlEditor ? 'bg-background max-w-auto max-w-none rounded-lg' : ''}
                          />
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
        </div>
      </div>
    </Tabs>
  );
}
