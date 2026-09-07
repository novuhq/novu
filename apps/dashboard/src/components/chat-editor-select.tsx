import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { RiCodeSSlashFill, RiDashboardLine } from 'react-icons/ri';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { isEmptyMailyJson } from '@/components/maily/maily-utils';
import { FormField } from '@/components/primitives/form/form';
import { Tabs, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import {
  type ChatEditorType,
  deriveChatEditorType,
} from '@/components/workflow-editor/steps/chat/derive-chat-editor-type';

const EDITOR_TYPE_LABEL: Record<ChatEditorType, string> = {
  block: 'Block editor',
  text: 'Text editor',
};

export const ChatEditorSelect = ({
  isLoading,
  saveForm,
  disabled,
}: {
  isLoading: boolean;
  saveForm?: (options: { editorType: ChatEditorType; forceSubmit?: boolean; onSuccess?: () => void }) => Promise<void>;
  disabled?: boolean;
}) => {
  const { control, setValue } = useFormContext();
  const [pendingEditorType, setPendingEditorType] = useState<ChatEditorType | null>(null);
  const body = useWatch({ name: 'body', control });
  const editorType = useWatch({ name: 'editorType', control });

  useEffect(() => {
    const resolvedEditorType = deriveChatEditorType(body, editorType, true);
    if (editorType === resolvedEditorType) {
      return;
    }

    setValue('editorType', resolvedEditorType, { shouldDirty: false, shouldValidate: false });
  }, [body, editorType, setValue]);

  return (
    <FormField
      control={control}
      name="editorType"
      render={({ field }) => {
        const displayValue = deriveChatEditorType(body, field.value, true);

        return (
          <>
            <Tabs
              defaultValue="editor"
              value={displayValue}
              onValueChange={(value) => {
                if (value !== 'block' && value !== 'text') {
                  return;
                }

                if (value === displayValue) {
                  return;
                }

                if (!body || body === '' || isEmptyMailyJson(body)) {
                  field.onChange(value);
                  if (isEmptyMailyJson(body)) {
                    setValue('body', '', { shouldDirty: true });
                  }

                  return;
                }

                setPendingEditorType(value);
              }}
              className="flex h-full flex-1 flex-col"
            >
              <TabsList className="w-min">
                <TabsTrigger value="block" className="gap-1.5" size="xs" disabled={disabled}>
                  <RiDashboardLine className="size-3.5" />
                  <span>Block editor</span>
                </TabsTrigger>
                <TabsTrigger value="text" className="gap-1.5" size="xs" disabled={disabled}>
                  <RiCodeSSlashFill className="size-3.5" />
                  <span>Text editor</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <ConfirmationModal
              open={pendingEditorType !== null}
              onOpenChange={(open) => {
                if (!open) {
                  setPendingEditorType(null);
                }
              }}
              onConfirm={() => {
                if (!pendingEditorType) {
                  return;
                }

                const nextEditorType = pendingEditorType;
                field.onChange(nextEditorType);
                setValue('body', '', { shouldDirty: true });
                saveForm?.({ editorType: nextEditorType, onSuccess: () => setPendingEditorType(null) });
              }}
              title="Are you sure?"
              description={`Switching to the ${pendingEditorType ? EDITOR_TYPE_LABEL[pendingEditorType] : 'editor'} will erase your current content. You'll start from an empty template. Sure you want to continue?`}
              confirmButtonText="Proceed"
              isLoading={isLoading}
            />
          </>
        );
      }}
    />
  );
};
