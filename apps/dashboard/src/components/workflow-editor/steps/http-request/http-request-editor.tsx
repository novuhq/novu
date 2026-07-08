import { EnvironmentTypeEnum, type UiSchema, UiSchemaGroupEnum } from '@novu/shared';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  SegmentedControl,
  SegmentedControlList,
  SegmentedControlTrigger,
} from '@/components/primitives/segmented-control';
import { SidebarContent } from '@/components/side-navigation/sidebar';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { TabsSection } from '@/components/workflow-editor/steps/tabs-section';
import { useEnvironment } from '@/context/environment/hooks';
import { StepEditorUnavailable } from '../step-editor-unavailable';
import {
  type BodyEditorMode,
  canMethodHaveBody,
  formatJsonBodyString,
  getInitialBodyEditorMode,
  getKeyValuePairsFromBody,
  getRawBodyString,
  type HttpRequestBodyValue,
  keyValuePairsToBodyString,
} from './curl-utils';
import { KeyValuePairList } from './key-value-pair-list';
import { RawBodyEditor } from './raw-body-editor';
import { RequestEndpoint } from './request-endpoint';
import { ResponseBodySchema } from './response-body-schema';

type HttpRequestEditorProps = {
  uiSchema: UiSchema;
};

export function HttpRequestEditor({ uiSchema }: HttpRequestEditorProps) {
  const { currentEnvironment } = useEnvironment();
  const { watch, setValue, getValues } = useFormContext();
  const { saveForm } = useSaveForm();
  const method = watch('method');
  const [bodyMode, setBodyMode] = useState<BodyEditorMode>(() =>
    getInitialBodyEditorMode(getValues('body') as HttpRequestBodyValue)
  );
  const hasBody = canMethodHaveBody(method);

  if (uiSchema.group !== UiSchemaGroupEnum.HTTP_REQUEST) {
    return null;
  }

  if (currentEnvironment?.type !== EnvironmentTypeEnum.DEV) {
    return <StepEditorUnavailable />;
  }

  const handleBodyModeChange = (mode: BodyEditorMode) => {
    const currentBody = getValues('body') as HttpRequestBodyValue;

    if (mode === 'raw') {
      setValue('body', formatJsonBodyString(getRawBodyString(currentBody)), { shouldDirty: true });
    } else {
      setValue('body', keyValuePairsToBodyString(getKeyValuePairsFromBody(currentBody)), { shouldDirty: true });
    }

    setBodyMode(mode);
    saveForm();
  };

  const bodyModeControl = (
    <SegmentedControl
      value={bodyMode}
      onValueChange={(value) => {
        if (value === 'key-value' || value === 'raw') {
          handleBodyModeChange(value);
        }
      }}
    >
      <SegmentedControlList className="w-fit min-w-[148px] rounded-md bg-neutral-alpha-100 p-0.5">
        <SegmentedControlTrigger value="key-value" className="h-5 px-2 text-label-xs font-medium">
          Key-value
        </SegmentedControlTrigger>
        <SegmentedControlTrigger value="raw" className="h-5 px-2 text-label-xs font-medium">
          Raw JSON
        </SegmentedControlTrigger>
      </SegmentedControlList>
    </SegmentedControl>
  );

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
            {bodyMode === 'key-value' ? (
              <KeyValuePairList
                fieldName="body"
                label="Request body"
                tooltip="Key-value pairs to include in the request body"
                rightSlot={bodyModeControl}
              />
            ) : (
              <RawBodyEditor rightSlot={bodyModeControl} />
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
