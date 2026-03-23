import { ContextPayload, type ISubscriberResponseDto, type WorkflowResponseDto } from '@novu/shared';
import { useState } from 'react';
import { PreviewContextSection } from '@/components/preview-context-section';
import { PreviewSubscriberSection } from '@/components/preview-subscriber-section';
import { Accordion } from '@/components/primitives/accordion';
import { PreviewPayloadSection } from '@/components/workflow-editor/steps/components/preview-payload-section';
import { PayloadData, PreviewSubscriberData } from '@/components/workflow-editor/steps/types/preview-context.types';
import { useIsPayloadSchemaEnabled } from '@/hooks/use-is-payload-schema-enabled';

type TestWorkflowContentProps = {
  workflow?: WorkflowResponseDto;
  payloadData: PayloadData;
  subscriberData: PreviewSubscriberData | null;
  contextData: ContextPayload | null;
  isLoadingSubscriber?: boolean;
  onPayloadUpdate: (data: PayloadData) => void;
  onSubscriberUpdate: (data: PreviewSubscriberData) => void;
  onSubscriberSelect: (subscriber: ISubscriberResponseDto) => void;
  onContextUpdate: (data: ContextPayload) => void;
  onClearPersistedPayload?: () => void;
  onClearPersistedSubscriber?: () => void;
  onClearPersistedContext?: () => void;
  onEditSubscriber?: () => void;
};

export function TestWorkflowContent({
  workflow,
  payloadData,
  subscriberData,
  contextData,
  onPayloadUpdate,
  onSubscriberUpdate,
  onSubscriberSelect,
  onContextUpdate,
  onClearPersistedPayload,
  onClearPersistedSubscriber,
  onClearPersistedContext,
  onEditSubscriber,
}: TestWorkflowContentProps) {
  const isPayloadSchemaEnabled = useIsPayloadSchemaEnabled();

  const defaultAccordionValue = ['payload', 'subscriber', 'context'];
  const [accordionValue, setAccordionValue] = useState(defaultAccordionValue);

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="border-b border-neutral-200 px-3 py-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-label-lg text-text-strong">Test workflow</h2>
          <p className="text-paragraph-xs text-text-soft">
            Time to test the workflow you just built.{' '}
            <a
              href="https://docs.novu.co/platform/concepts/trigger"
              target="_blank"
              className="underline"
              rel="noopener"
            >
              Learn more ↗
            </a>
          </p>
        </div>
      </div>

      <div className="bg-bg-weak flex-1 min-h-0 overflow-auto">
        <Accordion type="multiple" value={accordionValue} onValueChange={setAccordionValue}>
          <PreviewPayloadSection
            errors={{ payload: null, subscriber: null, steps: null, context: null, env: null }}
            localParsedData={{
              payload: payloadData,
              subscriber: subscriberData ?? {},
              steps: {},
              context: contextData ?? {},
              env: {},
            }}
            workflow={workflow}
            onUpdate={(_section, data) => onPayloadUpdate(data as PayloadData)}
            schema={isPayloadSchemaEnabled ? workflow?.payloadSchema : undefined}
            onClearPersisted={onClearPersistedPayload}
          />

          <PreviewSubscriberSection
            error={null}
            subscriber={subscriberData ?? {}}
            workflow={workflow}
            onUpdate={(_section, data) => onSubscriberUpdate(data)}
            onSubscriberSelect={onSubscriberSelect}
            onClearPersisted={onClearPersistedSubscriber}
            onEditSubscriber={onEditSubscriber}
          />

          <PreviewContextSection
            error={null}
            context={contextData ?? {}}
            onUpdate={(_section, data) => onContextUpdate(data)}
            onClearPersisted={onClearPersistedContext}
          />
        </Accordion>
      </div>
    </div>
  );
}
