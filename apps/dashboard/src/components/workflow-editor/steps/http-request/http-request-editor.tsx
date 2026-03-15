import { EnvironmentTypeEnum, type UiSchema, UiSchemaGroupEnum } from '@novu/shared';
import { useFormContext } from 'react-hook-form';
import { SidebarContent } from '@/components/side-navigation/sidebar';
import { TabsSection } from '@/components/workflow-editor/steps/tabs-section';
import { useEnvironment } from '@/context/environment/hooks';
import { StepEditorUnavailable } from '../step-editor-unavailable';
import { canMethodHaveBody } from './curl-utils';
import { KeyValuePairList } from './key-value-pair-list';
import { RequestEndpoint } from './request-endpoint';
import { ResponseBodySchema } from './response-body-schema';

type HttpRequestEditorProps = {
  uiSchema: UiSchema;
};

export function HttpRequestEditor({ uiSchema }: HttpRequestEditorProps) {
  const { currentEnvironment } = useEnvironment();
  const { watch } = useFormContext();
  const method = watch('method');
  const hasBody = canMethodHaveBody(method);

  if (uiSchema.group !== UiSchemaGroupEnum.HTTP_REQUEST) {
    return null;
  }

  if (currentEnvironment?.type !== EnvironmentTypeEnum.DEV) {
    return <StepEditorUnavailable />;
  }

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
          <KeyValuePairList
            fieldName="body"
            label="Request body"
            tooltip="Key-value pairs to include in the request body"
          />
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
