import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { RiDashboardLine, RiText } from 'react-icons/ri';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { FormField } from '@/components/primitives/form/form';
import { Tabs, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { isEmptyMailyJson, isMailyJson } from './maily/maily-utils';
import { plainTextWithLiquidToMailyDoc } from './maily/text-to-maily';

export const ChatEditorSelect = ({
  isLoading,
  saveForm,
  disabled,
}: {
  isLoading: boolean;
  saveForm?: (options: { forceSubmit?: boolean; onSuccess?: () => void }) => Promise<void>;
  disabled?: boolean;
}) => {
  const { control, setValue } = useFormContext();
  const [isSwitchingToText, setIsSwitchingToText] = useState(false);
  const body = useWatch({ name: 'body', control });

  return (
    <FormField
      control={control}
      name="editorType"
      render={({ field }) => {
        const effectiveValue = field.value ?? (isMailyJson(body) || !body ? 'block' : 'text');

        return (
          <>
            <Tabs
              value={effectiveValue}
              onValueChange={(value) => {
                if (value === effectiveValue) return;

                if (value === 'block') {
                  // Lossless conversion: plain text with {{ }} variables becomes a doc with pills
                  if (body && !isMailyJson(body)) {
                    setValue('body', JSON.stringify(plainTextWithLiquidToMailyDoc(body)), { shouldDirty: true });
                  }

                  field.onChange('block');
                  saveForm?.({ forceSubmit: true });

                  return;
                }

                if (!body || isEmptyMailyJson(body)) {
                  setValue('body', '', { shouldDirty: true });
                  field.onChange('text');
                  saveForm?.({ forceSubmit: true });

                  return;
                }

                setIsSwitchingToText(true);
              }}
              className="flex h-full flex-1 flex-col"
            >
              <TabsList className="w-min">
                <TabsTrigger value="block" className="gap-1.5" size="xs" disabled={disabled}>
                  <RiDashboardLine className="size-3.5" />
                  <span>Blocks</span>
                </TabsTrigger>
                <TabsTrigger value="text" className="gap-1.5" size="xs" disabled={disabled}>
                  <RiText className="size-3.5" />
                  <span>Text</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <ConfirmationModal
              open={isSwitchingToText}
              onOpenChange={setIsSwitchingToText}
              onConfirm={() => {
                setValue('body', '', { shouldDirty: true });
                field.onChange('text');
                saveForm?.({ forceSubmit: true, onSuccess: () => setIsSwitchingToText(false) });
              }}
              title="Are you sure?"
              description="Switching to text mode will reset your blocks. You'll start fresh with plain text. Sure you want to do that?"
              confirmButtonText="Proceed"
              isLoading={isLoading}
            />
          </>
        );
      }}
    />
  );
};
