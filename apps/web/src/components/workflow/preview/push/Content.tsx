import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useEnvironment } from '../../../../hooks/useEnvironment';
import { api } from '../../../../api';
import { IForm } from '../../../../pages/templates/components/formTypes';
import { useTemplateEditorForm } from '../../../../pages/templates/components/TemplateEditorFormProvider';
import { usePreviewPushTemplate } from '../../../../pages/templates/hooks/usePreviewPushTemplate';
import { useStepFormPath } from '../../../../pages/templates/hooks/useStepFormPath';
import { useTemplateLocales } from '../../../../pages/templates/hooks/useTemplateLocales';
import { PushBasePreview } from './PushBasePreview';

export default function Content({
  showLoading = false,
  showOverlay = true,
  controlVariables,
}: {
  showLoading?: boolean;
  showOverlay?: boolean;
  controlVariables?: any;
}) {
  const { template } = useTemplateEditorForm();
  const { bridge } = useEnvironment({ bridge: template?.bridge });

  const { watch, formState } = useFormContext<IForm>();
  const path = useStepFormPath();

  const stepId = watch(`${path}.uuid`);
  const title = watch(`${path}.template.title`);
  const content = watch(`${path}.template.content`);
  const [bridgeContent, setBridgeContent] = useState('');
  const [bridgeSubject, setBridgeSubject] = useState('');

  const {
    mutateAsync,
    isLoading: isBridgeLoading,
    error: previewError,
  } = useMutation((data) => api.post(`/v1/bridge/preview/${formState?.defaultValues?.identifier}/${stepId}`, data), {
    onSuccess(data) {
      setBridgeContent(data.outputs.body);
      setBridgeSubject(data.outputs.subject);
    },
  });

  const { selectedLocale, locales, areLocalesLoading, onLocaleChange } = useTemplateLocales({
    content: content as string,
    title,
    disabled: showLoading || bridge,
  });

  const { isPreviewLoading, parsedPreviewState, templateError } = usePreviewPushTemplate({
    disabled: showLoading || bridge,
    locale: selectedLocale,
  });

  useEffect(() => {
    if (bridge) {
      mutateAsync(controlVariables);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridge, controlVariables]);

  return (
    <PushBasePreview
      content={parsedPreviewState.content || bridgeContent || ''}
      title={parsedPreviewState.title || bridgeSubject || ''}
      locales={locales || []}
      selectedLocale={selectedLocale}
      onLocaleChange={onLocaleChange}
      showEditOverlay={showOverlay}
      bridge={bridge}
      error={templateError}
      loading={isPreviewLoading || isBridgeLoading || showLoading || areLocalesLoading}
    />
  );
}
