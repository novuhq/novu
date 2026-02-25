import { useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { RiGitCommitFill, RiHtml5Fill, RiReactjsFill } from 'react-icons/ri';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Badge, BadgeIcon } from '@/components/primitives/badge';
import { FormField } from '@/components/primitives/form/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { useSaveForm } from '../save-form-context';

export const EmailRendererSelect = () => {
  const { control, setValue } = useFormContext();
  const { saveForm } = useSaveForm();
  const editorType = useWatch({ name: 'editorType', control });
  const rendererType = useWatch({ name: 'rendererType', control });
  const stepResolverHash = useWatch({ name: 'stepResolverHash', control });
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [pendingValue, setPendingValue] = useState<string | null>(null);

  if (editorType !== 'html') {
    return null;
  }

  return (
    <>
      <FormField
        control={control}
        name="rendererType"
        render={({ field }) => {
          const handleValueChange = (value: string) => {
            if (field.value === 'react-email' && value !== 'react-email') {
              setPendingValue(value);
              setIsDisconnectModalOpen(true);

              return;
            }

            field.onChange(value);
            saveForm({ forceSubmit: true });
          };

          return (
            <Select value={field.value ?? 'html'} onValueChange={handleValueChange}>
              <SelectTrigger
                size="2xs"
                className="w-auto bg-bg-weak border-transparent hover:border-transparent hover:bg-neutral-100 [&_span]:text-neutral-600"
              >
                <SelectValue placeholder="Select renderer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="html" className="text-paragraph-xs">
                  <div className="flex items-center gap-1.5">
                    <RiHtml5Fill className="size-3.5 text-[#E34F26]" />
                    HTML
                  </div>
                </SelectItem>
                <SelectItem value="react-email" className="text-paragraph-xs">
                  <div className="flex items-center gap-1.5">
                    <RiReactjsFill className="size-3.5 text-[#61DAFB]" />
                    React.email
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          );
        }}
      />
      <ConfirmationModal
        open={isDisconnectModalOpen}
        onOpenChange={setIsDisconnectModalOpen}
        onConfirm={() => {
          if (pendingValue) {
            setValue('rendererType', pendingValue as 'html' | 'react-email');
            setValue('stepResolverHash', undefined);
            saveForm({ forceSubmit: true });
          }

          setIsDisconnectModalOpen(false);
          setPendingValue(null);
        }}
        title="Disconnect React Email template?"
        description="Switching away will remove the connection to your deployed React Email template. You'll need to run novu email publish again to reconnect."
        confirmButtonText="Disconnect"
      />
      {rendererType === 'react-email' && stepResolverHash && (
        <Badge variant="lighter" color="gray" size="md" className="ml-auto font-mono tracking-wide">
          <BadgeIcon as={RiGitCommitFill} className="rotate-90" />
          {stepResolverHash}
        </Badge>
      )}
    </>
  );
};
