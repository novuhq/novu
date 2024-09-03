import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { useEnvironment } from '../../../../hooks/useEnvironment';
import { api } from '../../../../api';
import { IForm } from '../../../../pages/templates/components/formTypes';
import { useTemplateEditorForm } from '../../../../pages/templates/components/TemplateEditorFormProvider';
import { useNavigateToStepEditor } from '../../../../pages/templates/hooks/useNavigateToStepEditor';
import { usePreviewSmsTemplate } from '../../../../pages/templates/hooks/usePreviewSmsTemplate';
import { useStepFormPath } from '../../../../pages/templates/hooks/useStepFormPath';
import { useTemplateLocales } from '../../../../pages/templates/hooks/useTemplateLocales';
import { SmsBasePreview } from './SmsBasePreview';

export const SmsPreview = ({
  showPreviewAsLoading = false,
  controlVariables,
}: {
  showPreviewAsLoading?: boolean;
  controlVariables?: any;
}) => {
  const { navigateToStepEditor } = useNavigateToStepEditor();
  const { watch, formState } = useFormContext<IForm>();
  const { template } = useTemplateEditorForm();
  const { bridge } = useEnvironment({ bridge: template?.bridge });
  const path = useStepFormPath();
  const templateContent = watch(`${path}.template.content`);
  const { pathname } = useLocation();
  const isPreviewPath = pathname.endsWith('/preview');
  const stepId = watch(`${path}.uuid`);
  const [bridgeContent, setBridgeContent] = useState('');

  const { mutateAsync, isLoading: isBridgeLoading } = useMutation(
    (data) => api.post(`/v1/bridge/preview/${formState?.defaultValues?.identifier}/${stepId}`, data),
    {
      onSuccess(data) {
        setBridgeContent(data.outputs.body);
      },
    }
  );

  useEffect(() => {
    if (bridge) {
      mutateAsync(controlVariables);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridge, controlVariables]);

  const { selectedLocale, locales, areLocalesLoading, onLocaleChange } = useTemplateLocales({
    content: templateContent as string,
    disabled: showPreviewAsLoading,
  });

  const { isPreviewContentLoading, previewContent, templateError } = usePreviewSmsTemplate(
    selectedLocale,
    showPreviewAsLoading || bridge
  );

  return (
    <SmsBasePreview
      content={bridge ? bridgeContent : previewContent}
      onLocaleChange={onLocaleChange}
      locales={locales}
      showEditOverlay={isPreviewPath}
      selectedLocale={selectedLocale}
      loading={isPreviewContentLoading || areLocalesLoading || isBridgeLoading}
      onEditClick={navigateToStepEditor}
      error={bridge ? undefined : templateError}
    />
  );
};
