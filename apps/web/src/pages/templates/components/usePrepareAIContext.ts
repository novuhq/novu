import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { IEmailBlock } from '@novu/shared';

import type { IForm, IFormStep, ITemplates } from './formTypes';

import { useTemplateEditorForm } from '../components/TemplateEditorFormProvider';

interface IStepEntityExtended extends IFormStep {
  template: ITemplates & {
    content: IEmailBlock[];
  };
}

interface IFormExtended extends IForm {
  steps: IStepEntityExtended[];
}

export function usePrepareAIContext(stepIndex: number) {
  const [context, setContext] = useState('');
  const { template } = useTemplateEditorForm();

  const { watch } = useFormContext<IFormExtended>();
  const stepName = watch(`steps.${stepIndex}.name`);
  const channel = watch(`steps.${stepIndex}.template.type`);
  const emailSubject = watch(`steps.${stepIndex}.template.subject`);

  const workflow = {
    name: template?.name,
    templateName: stepName,
    emailSubject,
  };

  return {
    context,
    setContext,
    workflow,
  };
}
