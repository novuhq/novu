import { WorkflowResponseDto, StepTypeEnum, ISubscriberResponseDto } from '@novu/shared';

export type PreviewContextPanelProps = {
  workflow?: WorkflowResponseDto;
  value: string;
  onChange: (value: string) => Error | null;
  subscriberData?: Record<string, any>;
  currentStepId?: string;
};

export type ParsedData = {
  payload: any;
  subscriber: any;
  steps: any;
};

export type ValidationErrors = {
  payload: string | null;
  subscriber: string | null;
};

export type AccordionSectionProps = {
  errors: ValidationErrors;
  localParsedData: ParsedData;
  workflow?: WorkflowResponseDto;
  onUpdate: (section: keyof ParsedData, data: any) => void;
};

export type PayloadSectionProps = AccordionSectionProps & {
  onClearPersisted?: () => void;
};

export type StepResultsSectionProps = AccordionSectionProps & {
  currentStepId?: string;
};

export type SubscriberSectionProps = AccordionSectionProps & {
  onSubscriberSelect: (subscriber: ISubscriberResponseDto) => void;
};
