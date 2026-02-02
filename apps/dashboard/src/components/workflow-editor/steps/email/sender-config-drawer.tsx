import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { RiInformation2Line } from 'react-icons/ri';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/primitives/form/form';
import { Input } from '@/components/primitives/input';
import { Separator } from '@/components/primitives/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/primitives/sheet';
import { Switch } from '@/components/primitives/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { usePrimaryEmailIntegration } from '@/hooks/use-primary-email-integration';

type SenderConfigDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SenderConfigDrawer({ open, onOpenChange }: SenderConfigDrawerProps) {
  const { control, watch, setValue, trigger } = useFormContext();
  const { senderEmail: integrationEmail, senderName: integrationName } = usePrimaryEmailIntegration();

  const fromEmail = watch('from.email');
  const fromName = watch('from.name');
  const useProviderDefaults = fromEmail === undefined && fromName === undefined;

  const [localEmail, setLocalEmail] = useState(fromEmail || '');
  const [localName, setLocalName] = useState(fromName || '');

  useEffect(() => {
    setLocalEmail(fromEmail || '');
    setLocalName(fromName || '');
  }, [fromEmail, fromName]);

  const handleToggleDefaults = async (checked: boolean) => {
    if (checked) {
      setValue('from.email', undefined, { shouldDirty: true, shouldValidate: true });
      setValue('from.name', undefined, { shouldDirty: true, shouldValidate: true });
      setLocalEmail('');
      setLocalName('');
    } else {
      setValue('from.email', '', { shouldDirty: true, shouldValidate: true });
      setValue('from.name', '', { shouldDirty: true, shouldValidate: true });
      setLocalEmail('');
      setLocalName('');
    }

    await trigger();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[400px] flex-col p-0 sm:max-w-[400px]">
        <SheetHeader className="space-y-1 px-3 py-4">
          <SheetTitle className="text-label-lg flex items-center gap-2">Sender configuration</SheetTitle>
          <SheetDescription className="text-paragraph-xs mt-0 hidden">
            Configure the sender name and email address for this email step.
          </SheetDescription>
        </SheetHeader>
        <Separator />

        <div className="flex-1 space-y-4 overflow-auto p-3">
          <div className="rounded-4 border flex items-center justify-between border-neutral-100 bg-white p-1.5">
            <div className="text-text-strong text-label-xs flex items-center gap-1">
              Use provider defaults
              <Tooltip>
                <TooltipTrigger className="flex cursor-default flex-row items-center gap-1">
                  <RiInformation2Line className="size-3 text-neutral-400" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    When enabled, the email will use the sender name and email from your configured email integration.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Switch checked={useProviderDefaults} onCheckedChange={handleToggleDefaults} />
          </div>

          <FormField
            control={control}
            name="from.name"
            render={() => (
              <FormItem>
                <FormLabel>Sender name</FormLabel>
                <FormControl>
                  <Input
                    placeholder={integrationName || 'e.g. Acme Security'}
                    disabled={useProviderDefaults}
                    value={localName}
                    onChange={(e) => {
                      setLocalName(e.target.value);
                    }}
                    onBlur={() => {
                      setValue('from.name', localName, { shouldDirty: true, shouldValidate: true });
                      trigger();
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="from.email"
            render={() => (
              <FormItem>
                <FormLabel>Sender email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={integrationEmail || 'e.g. noreply@acme.com'}
                    disabled={useProviderDefaults}
                    value={localEmail}
                    onChange={(e) => {
                      setLocalEmail(e.target.value);
                    }}
                    onBlur={() => {
                      setValue('from.email', localEmail, { shouldDirty: true, shouldValidate: true });
                      trigger();
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
