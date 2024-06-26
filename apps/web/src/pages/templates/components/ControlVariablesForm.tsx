import { IS_DOCKER_HOSTED } from '../../../config/index';
import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { useStepFormPath } from '../hooks/useStepFormPath';
import { useTemplateEditorForm } from './TemplateEditorFormProvider';
import { ControlVariablesForm as Component } from '../../../ee/editor/index';

export const ControlVariablesForm = ({ onChange }: { onChange?: (data: any) => void }) => {
  const stepFormPath = useStepFormPath();
  const { watch } = useFormContext();
  const { template } = useTemplateEditorForm();
  const controls =
    watch(`${stepFormPath}.template.controls.schema`) || watch(`${stepFormPath}.template.inputs.schema`) || {};
  const workflowPayloadSchema = watch(`payloadSchema`) || {};

  const stepId = watch(`${stepFormPath}.stepId`);
  const _stepId = watch(`${stepFormPath}._id`);
  const formData = useMemo(() => {
    return {
      _workflowId: template?._id,
      workflowId: template?.triggers[0].identifier,
      stepId,
      _stepId,
    };
  }, [stepId, _stepId, template]);

  if (IS_DOCKER_HOSTED) {
    return null;
  }

  return <Component payloadSchema={workflowPayloadSchema} schema={controls} formData={formData} onChange={onChange} />;
};
