import { EnvironmentTypeEnum, type UiSchema, UiSchemaGroupEnum } from '@novu/shared';
import { AnimatePresence, motion } from 'motion/react';
import { RiGlobalLine } from 'react-icons/ri';
import { SidebarContent } from '@/components/side-navigation/sidebar';
import { TabsSection } from '@/components/workflow-editor/steps/tabs-section';
import { useEnvironment } from '@/context/environment/hooks';
import { StepEditorUnavailable } from '../step-editor-unavailable';
import { KeyValuePairList } from './key-value-pair-list';
import { RequestEndpoint } from './request-endpoint';
import { ResponseBodySchema } from './response-body-schema';
import { useCopyPrompt } from './use-copy-prompt';
import { useHttpRequestTest } from './use-http-request-test';

type HttpRequestEditorProps = {
  uiSchema: UiSchema;
};

export function HttpRequestEditor({ uiSchema }: HttpRequestEditorProps) {
  const { currentEnvironment } = useEnvironment();
  const handleCopyPrompt = useCopyPrompt();
  const { testResult } = useHttpRequestTest();

  const hasSuccessfulResponse = testResult !== null && testResult.statusCode >= 200 && testResult.statusCode < 300;

  if (uiSchema.group !== UiSchemaGroupEnum.HTTP_REQUEST) {
    return null;
  }

  if (currentEnvironment?.type !== EnvironmentTypeEnum.DEV) {
    return <StepEditorUnavailable />;
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <TabsSection className="gap-2 p-0">
        <AnimatePresence initial={false}>
          {!hasSuccessfulResponse && (
            <motion.div
              key="tip-banner"
              animate={{ opacity: 1, height: 'auto', marginBottom: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: '-8px' }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div className="bg-bg-weak flex items-center gap-2 rounded-lg border border-neutral-100 px-3 py-2">
                <RiGlobalLine className="text-text-soft size-4 flex-shrink-0" />
                <p className="text-text-sub text-xs">
                  <strong className="text-text-strong font-medium">Tip:</strong>
                  {' Use this pre-built prompt to let LLM implement this API faster.'}
                </p>
                <button
                  type="button"
                  className="text-text-strong ml-auto flex-shrink-0 text-xs font-medium hover:underline"
                  onClick={handleCopyPrompt}
                >
                  Copy prompt
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <RequestEndpoint />

        <KeyValuePairList
          fieldName="headers"
          label="Request headers"
          tooltip="Custom HTTP headers to include with the request"
        />

        <KeyValuePairList
          fieldName="body"
          label="Request body"
          tooltip="Key-value pairs to include in the request body"
        />

        <p className="text-text-sub px-1 text-xs">
          <span>💡 Tip: </span>
          <span className="text-text-sub font-normal">
            Supports variables, type {'{{'}
            {'{'} for more.
          </span>
        </p>
      </TabsSection>

      <SidebarContent size="md" className="gap-3 p-0 pt-3">
        <ResponseBodySchema />
      </SidebarContent>
    </div>
  );
}
