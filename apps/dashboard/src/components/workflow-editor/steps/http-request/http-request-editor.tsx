import { EnvironmentTypeEnum, type UiSchema, UiSchemaGroupEnum } from '@novu/shared';
import { useFormContext } from 'react-hook-form';
import { SidebarContent } from '@/components/side-navigation/sidebar';
import { ToggleGroup, ToggleGroupItem } from '@/components/primitives/toggle-group';
import { TabsSection } from '@/components/workflow-editor/steps/tabs-section';
import { useEnvironment } from '@/context/environment/hooks';
import { StepEditorUnavailable } from '../step-editor-unavailable';
import { canMethodHaveBody } from './curl-utils';
import { KeyValuePairList } from './key-value-pair-list';
import { RawBodyEditor } from './raw-body-editor';
import { RequestEndpoint } from './request-endpoint';
import { ResponseBodySchema } from './response-body-schema';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';

type HttpRequestEditorProps = {
  uiSchema: UiSchema;
};

export function HttpRequestEditor({ uiSchema }: HttpRequestEditorProps) {
  const { currentEnvironment } = useEnvironment();
  const { watch, setValue } = useFormContext();
  const { saveForm } = useSaveForm();
  const method = watch('method');
  const bodyMode = watch('bodyMode') || 'key-value';
  const hasBody = canMethodHaveBody(method);

  if (uiSchema.group !== UiSchemaGroupEnum.HTTP_REQUEST) {
    return null;
  }

  if (currentEnvironment?.type !== EnvironmentTypeEnum.DEV) {
    return <StepEditorUnavailable />;
  }

  const rawBody = watch('rawBody');

  const handleBodyModeChange = (mode: 'key-value' | 'raw') => {
    if (mode === 'key-value' && bodyMode === 'raw' && rawBody?.trim()) {
      const confirmed = window.confirm(
        'Switching to Key-Value mode will discard your raw JSON body. Continue?'
      );
      if (!confirmed) return;
    }

    setValue('bodyMode', mode);
    saveForm();
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <TabsSection className="gap-2 p-0">
        <RequestEndpoint />

        <KeyValuePairList
          fieldName="headers"
          label="Request headers"
          tooltip="Custom HTTP headers to include with the request"
        />

        {hasBody && (
          <>
            <ToggleGroup
              type="single"
              value={bodyMode}
              onValueChange={(value) => {
                if (value === 'key-value' || value === 'raw') {
                  handleBodyModeChange(value);
                }
              }}
              className="justify-start px-1"
            >
              <ToggleGroupItem value="key-value" aria-label="Key-Value mode" className="text-xs">
                Key-Value
              </ToggleGroupItem>
              <ToggleGroupItem value="raw" aria-label="Raw JSON mode" className="text-xs">
                Raw JSON
              </ToggleGroupItem>
            </ToggleGroup>

            {bodyMode === 'key-value' ? (
              <KeyValuePairList
                fieldName="body"
                label="Request body"
                tooltip="Key-value pairs to include in the request body"
              />
            ) : (
              <RawBodyEditor />
            )}
          </>
        )}

        <p className="text-text-sub px-1 text-xs">
          <span>💡 Tip: </span>
          <span className="text-text-sub font-normal">Supports variables, type {'{{'} for more.</span>
        </p>
      </TabsSection>

      <SidebarContent size="md" className="gap-3 p-0 pt-3">
        <ResponseBodySchema />
      </SidebarContent>
    </div>
  );
}
