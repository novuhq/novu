import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { RiInformation2Line } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { FormControl, FormItem, FormLabel, FormMessage } from '@/components/primitives/form/form';
import { InputRoot, InputWrapper } from '@/components/primitives/input';
import { Separator } from '@/components/primitives/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetMain,
  SheetTitle,
} from '@/components/primitives/sheet';
import { Switch } from '@/components/primitives/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { usePrimaryEmailIntegration } from '@/hooks/use-primary-email-integration';

type SenderConfigDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SenderConfigDrawer({ open, onOpenChange }: SenderConfigDrawerProps) {
  const { getValues, setValue } = useFormContext();
  const { saveForm } = useSaveForm();
  const { senderEmail: integrationEmail, senderName: integrationName } = usePrimaryEmailIntegration();
  const { step, digestStepBeforeCurrent } = useWorkflow();
  const { variables, isAllowedVariable } = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);

  const [localEmail, setLocalEmail] = useState('');
  const [localName, setLocalName] = useState('');
  const [localUseDefaults, setLocalUseDefaults] = useState(true);
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    if (open) {
      const values = getValues();
      const fromEmail = values.from?.email;
      const fromName = values.from?.name;

      setLocalEmail(fromEmail || '');
      setLocalName(fromName || '');
      setLocalUseDefaults(fromEmail === undefined && fromName === undefined);
      setEmailError('');
    }
  }, [open, getValues]);

  const validateEmail = (email: string): boolean => {
    if (!email) {
      return true;
    }

    if (/\{\{.*?\}\}/.test(email)) {
      return true;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailRegex.test(email);
  };

  const handleToggleDefaults = (checked: boolean) => {
    setLocalUseDefaults(checked);
    if (checked) {
      setLocalEmail('');
      setLocalName('');
      setEmailError('');
    }
  };

  const handleSave = async () => {
    if (!localUseDefaults && localEmail && !validateEmail(localEmail)) {
      setEmailError('Please enter a valid email address');

      return;
    }

    if (localUseDefaults) {
      setValue('from.email', undefined, { shouldDirty: true });
      setValue('from.name', undefined, { shouldDirty: true });
    } else {
      setValue('from.email', localEmail || undefined, { shouldDirty: true });
      setValue('from.name', localName || undefined, { shouldDirty: true });
    }

    await saveForm({ forceSubmit: true });
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[400px] flex-col p-0 sm:max-w-[400px]">
        <SheetHeader className="space-y-1 px-3 py-4">
          <SheetTitle className="text-label-lg flex items-center gap-2 mb-0">Sender configuration</SheetTitle>
          <SheetDescription className="text-paragraph-xs mt-0 hidden">
            Configure the sender name and email address for this email step.
          </SheetDescription>
        </SheetHeader>
        <Separator />

        <SheetMain className="space-y-4 p-3">
          <div className="rounded-4 flex items-center justify-between bg-white mt-1.5">
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
            <Switch checked={localUseDefaults} onCheckedChange={handleToggleDefaults} />
          </div>
          <Separator />

          <div className="space-y-3">
            <FormItem>
              <FormLabel className="flex items-center gap-1">
                Sender name
                <Tooltip>
                  <TooltipTrigger className="flex cursor-default flex-row items-center gap-1">
                    <RiInformation2Line className="size-3 text-neutral-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>The display name shown in the recipient's inbox.</p>
                  </TooltipContent>
                </Tooltip>
              </FormLabel>
              <FormControl>
                <InputRoot>
                  <InputWrapper className="flex h-[2.35rem] items-center px-0">
                    <ControlInput
                      placeholder={
                        localUseDefaults ? integrationName || 'Acme Inc.' : integrationName || 'e.g. Acme Security'
                      }
                      disabled={localUseDefaults}
                      value={localName}
                      onChange={setLocalName}
                      variables={variables}
                      isAllowedVariable={isAllowedVariable}
                      size="sm"
                      indentWithTab={false}
                    />
                  </InputWrapper>
                </InputRoot>
              </FormControl>
            </FormItem>

            <FormItem>
              <FormLabel className="flex items-center gap-1">
                Sender email
                <Tooltip>
                  <TooltipTrigger className="flex cursor-default flex-row items-center gap-1">
                    <RiInformation2Line className="size-3 text-neutral-400" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[280px]">
                    <p>
                      The email address shown as "From" in the received email. Make sure this email is part of your
                      provider's authenticated domain.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </FormLabel>
              <FormControl>
                <InputRoot hasError={!!emailError}>
                  <InputWrapper className="flex h-[2.35rem] items-center px-0">
                    <ControlInput
                      placeholder={
                        localUseDefaults
                          ? integrationEmail || 'noreply@novu.co'
                          : integrationEmail || 'e.g. noreply@acme.com'
                      }
                      disabled={localUseDefaults}
                      value={localEmail}
                      onChange={(newEmail) => {
                        setLocalEmail(newEmail);
                        if (emailError && (!newEmail || validateEmail(newEmail))) {
                          setEmailError('');
                        }
                      }}
                      variables={variables}
                      isAllowedVariable={isAllowedVariable}
                      size="sm"
                      indentWithTab={false}
                    />
                  </InputWrapper>
                </InputRoot>
              </FormControl>
              {emailError && <FormMessage>{emailError}</FormMessage>}
            </FormItem>
          </div>
        </SheetMain>

        <Separator />
        <SheetFooter className="border-neutral-content-weak flex border-t px-3 py-1.5">
          <Button size="xs" mode="gradient" variant="secondary" onClick={handleSave}>
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
