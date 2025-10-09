import { ContextPayload, ISubscriberResponseDto, SubscriberDto, WorkflowResponseDto } from '@novu/shared';
import { JSONSchema7 } from 'json-schema';

export type PayloadData = Record<string, unknown>;
export type PreviewSubscriberData = Partial<SubscriberDto>;
export type StepsData = Record<string, unknown>;

export type PreviewContextPanelProps = {
  workflow?: WorkflowResponseDto;
  value: string;
  onChange: (value: string) => Error | null;
  subscriberData?: Record<string, unknown>;
  currentStepId?: string;
  selectedLocale?: string;
  onLocaleChange?: (locale: string) => void;
};

export type ParsedData = {
  payload: PayloadData;
  subscriber: PreviewSubscriberData;
  steps: StepsData;
  context: ContextPayload;
};

export type ValidationErrors = {
  payload: string | null;
  subscriber: string | null;
  steps: string | null;
  context: string | null;
};

export type AccordionSectionProps = {
  errors: ValidationErrors;
  localParsedData: ParsedData;
  workflow?: WorkflowResponseDto;
  onUpdate: (section: keyof ParsedData, data: PayloadData | PreviewSubscriberData | StepsData | ContextPayload) => void;
};

export type PayloadSectionProps = AccordionSectionProps & {
  schema?: JSONSchema7;
  onClearPersisted?: () => void;
  hasDigestStep?: boolean;
};

export type StepResultsSectionProps = AccordionSectionProps & {
  currentStepId?: string;
};

export type SubscriberSectionProps = Omit<AccordionSectionProps, 'errors' | 'localParsedData' | 'onUpdate'> & {
  error: string | null;
  subscriber: Partial<SubscriberDto>;
  schema?: JSONSchema7;
  onUpdate: (section: 'subscriber', data: PreviewSubscriberData) => void;
  onSubscriberSelect: (subscriber: ISubscriberResponseDto) => void;
  onClearPersisted?: () => void;
  onEditSubscriber?: () => void;
};

export type ContextSectionProps = Omit<AccordionSectionProps, 'errors' | 'localParsedData' | 'onUpdate'> & {
  error: string | null;
  context: ContextPayload;
  schema?: JSONSchema7;
  onUpdate: (section: 'context', data: ContextPayload) => void;
  onClearPersisted?: () => void;
};
