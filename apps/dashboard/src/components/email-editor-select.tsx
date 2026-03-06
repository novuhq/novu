import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { RiCodeSSlashFill, RiDashboardLine } from 'react-icons/ri';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { FormField } from '@/components/primitives/form/form';
import { Tabs, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { isEmptyMailyJson } from './maily/maily-utils';

export const EmailEditorSelect = ({
  isLoading,
  saveForm,
  disabled,
}: {
  isLoading: boolean;
  saveForm?: (options: {
    editorType: 'block' | 'html';
    forceSubmit?: boolean;
    onSuccess?: () => void;
  }) => Promise<void>;
  disabled?: boolean;
}) => {
  const { control, setValue } = useFormContext();
  const [isSwitchingToHtml, setIsSwitchingToHtml] = useState(false);
  const [isSwitchingToBlock, setIsSwitchingToBlock] = useState(false);
  const body = useWatch({ name: 'body', control });
  const rendererType = useWatch({ name: 'rendererType', control });

  return (
    <FormField
      control={control}
      name="editorType"
      render={({ field }) => {
        return (
          <>
            <Tabs
              defaultValue="editor"
              value={field.value ?? 'block'}
              onValueChange={(value) => {
                if (value === 'block' && rendererType === 'react-email') {
                  // react-email has no "body" field to check
                  setIsSwitchingToBlock(true);
                  return;
                }

                // allow freely switching if the body is empty string or maily json
                if (!body || body === '' || isEmptyMailyJson(body)) {
                  field.onChange(value);
                  return;
                }

                if (value === 'html') {
                  setIsSwitchingToHtml(true);
                  return;
                }

                setIsSwitchingToBlock(true);
              }}
              className="flex h-full flex-1 flex-col"
            >
              <TabsList className="w-min">
                <TabsTrigger value="block" className="gap-1.5" size="xs" disabled={disabled}>
                  <RiDashboardLine className="size-3.5" />
                  <span>Block editor</span>
                </TabsTrigger>
                <TabsTrigger value="html" className="gap-1.5" size="xs" disabled={disabled}>
                  <RiCodeSSlashFill className="size-3.5" />
                  <span>Code editor</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <ConfirmationModal
              open={isSwitchingToHtml}
              onOpenChange={setIsSwitchingToHtml}
              onConfirm={async () => {
                field.onChange('html');
                saveForm?.({ editorType: 'html', onSuccess: () => setIsSwitchingToHtml(false) });
              }}
              title="Are you sure?"
              description="You're switching to code editor. Once you do, you can't go back to blocks unless you reset the template. Ready to get your hands dirty?"
              confirmButtonText="Proceed"
              isLoading={isLoading}
            />
            <ConfirmationModal
              open={isSwitchingToBlock}
              onOpenChange={setIsSwitchingToBlock}
              onConfirm={() => {
                if (rendererType === 'react-email') {
                  setValue('rendererType', 'html', { shouldDirty: true });
                }

                field.onChange('block');
                saveForm?.({ editorType: 'block', onSuccess: () => setIsSwitchingToBlock(false) });
              }}
              title={rendererType === 'react-email' ? 'Disconnect React Email template?' : 'Are you sure?'}
              description={
                rendererType === 'react-email'
                  ? "Switching away will remove the connection to your deployed React Email template. You'll need to run novu email publish again to reconnect."
                  : "Switching to visual mode will reset your code. You'll start fresh with blocks. Sure you want to do that?"
              }
              confirmButtonText={rendererType === 'react-email' ? 'Disconnect' : 'Proceed'}
              isLoading={isLoading}
            />
          </>
        );
      }}
    />
  );
};
