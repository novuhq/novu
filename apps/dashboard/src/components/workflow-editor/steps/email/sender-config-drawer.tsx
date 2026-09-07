import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { RiArrowGoBackLine, RiExternalLinkLine, RiInformation2Line, RiLinkM } from 'react-icons/ri';
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
import {
  buildSenderConfigSavePayload,
  deriveFieldLinkState,
  deriveUseProviderDefaults,
  isValidSenderEmail,
  type SenderFieldKey,
  type SenderFieldLinkState,
} from '@/components/workflow-editor/steps/email/sender-config-drawer.utils';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { useWorkflowAgentEmailDefaults } from '@/components/workflow-editor/use-workflow-agent-email-defaults';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { usePrimaryEmailIntegration } from '@/hooks/use-primary-email-integration';

const AGENT_TRIGGER_DOCS_URL = 'https://docs.novu.co/agents/get-started/mental-model';

type SenderConfigDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled?: boolean;
};

export function SenderConfigDrawer({ open, onOpenChange, disabled = false }: SenderConfigDrawerProps) {
  const { getValues, setValue } = useFormContext();
  const { saveForm } = useSaveForm();
  const { senderEmail: integrationEmail, senderName: integrationName } = usePrimaryEmailIntegration();
  const { workflow, step, digestStepBeforeCurrent } = useWorkflow();
  const { variables, isAllowedVariable } = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);

  const agent = workflow?.agent ?? null;
  const hasAgent = Boolean(agent?.identifier);
  const agentDefaults = useWorkflowAgentEmailDefaults({ agent });

  const [localEmail, setLocalEmail] = useState('');
  const [localName, setLocalName] = useState('');
  const [localReplyTo, setLocalReplyTo] = useState('');
  const [localPreheader, setLocalPreheader] = useState('');
  const [localUseProviderDefaults, setLocalUseProviderDefaults] = useState(true);
  const [linkState, setLinkState] = useState<SenderFieldLinkState>({
    nameLinked: false,
    emailLinked: false,
    replyToLinked: false,
  });
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    if (!open) {
      return;
    }

    const values = getValues();
    const fromEmail = values.from?.email;
    const fromName = values.from?.name;
    const replyTo = values.replyTo;
    const preheader = values.preheader;

    const useProviderDefaults = deriveUseProviderDefaults({
      hasAgent,
      useProviderDefaults: values.useProviderDefaults,
      fromEmail,
      fromName,
    });
    const nextLinkState = deriveFieldLinkState({
      hasAgent,
      useProviderDefaults,
      fromEmail,
      fromName,
      replyTo,
    });

    setLocalEmail(fromEmail || '');
    setLocalName(fromName || '');
    setLocalReplyTo(replyTo || '');
    setLocalPreheader(preheader || '');
    setLocalUseProviderDefaults(useProviderDefaults);
    setLinkState(nextLinkState);
    setEmailError('');
  }, [open, getValues, hasAgent]);

  let namePlaceholder = integrationName || 'e.g. Acme Security';
  if (localUseProviderDefaults) {
    namePlaceholder = integrationName || 'Acme Inc.';
  } else if (hasAgent) {
    namePlaceholder = linkState.nameLinked
      ? agentDefaults.senderName || integrationName || 'Acme Inc.'
      : agentDefaults.senderName || integrationName || 'e.g. Acme Security';
  }

  let emailPlaceholder = integrationEmail || 'e.g. noreply@acme.com';
  if (localUseProviderDefaults) {
    emailPlaceholder = integrationEmail || 'noreply@novu.co';
  } else if (hasAgent) {
    emailPlaceholder = linkState.emailLinked
      ? agentDefaults.senderEmail || integrationEmail || 'noreply@novu.co'
      : agentDefaults.senderEmail || integrationEmail || 'e.g. noreply@acme.com';
  }

  const showAgentFieldActions = hasAgent && !localUseProviderDefaults && !disabled;
  const showReplyToAgentAction = hasAgent && !disabled;
  const nameDisabled = disabled || localUseProviderDefaults || (hasAgent && linkState.nameLinked);
  const emailDisabled = disabled || localUseProviderDefaults || (hasAgent && linkState.emailLinked);

  let displayedName = localName;
  if (localUseProviderDefaults) {
    displayedName = '';
  } else if (hasAgent && linkState.nameLinked) {
    displayedName = agentDefaults.senderName || '';
  }

  let displayedEmail = localEmail;
  if (localUseProviderDefaults) {
    displayedEmail = '';
  } else if (hasAgent && linkState.emailLinked) {
    displayedEmail = agentDefaults.senderEmail || '';
  }

  const displayedReplyTo = hasAgent && linkState.replyToLinked ? agentDefaults.replyTo || '' : localReplyTo;
  const replyToPlaceholder = (hasAgent && agentDefaults.replyTo) || 'e.g. support@acme.com';

  const handleToggleProviderDefaults = (checked: boolean) => {
    setLocalUseProviderDefaults(checked);
    setEmailError('');

    if (checked) {
      setLocalEmail('');
      setLocalName('');
      setLinkState((prev) => ({ ...prev, nameLinked: false, emailLinked: false }));

      return;
    }

    if (hasAgent) {
      setLocalEmail('');
      setLocalName('');
      setLinkState((prev) => ({ ...prev, nameLinked: true, emailLinked: true }));
    }
  };

  const handleUnlink = (field: SenderFieldKey) => {
    if (field === 'name') {
      setLinkState((prev) => ({ ...prev, nameLinked: false }));
      setLocalName(agentDefaults.senderName || '');

      return;
    }

    if (field === 'email') {
      setLinkState((prev) => ({ ...prev, emailLinked: false }));
      setLocalEmail(agentDefaults.senderEmail || '');

      return;
    }

    setLinkState((prev) => ({ ...prev, replyToLinked: false }));
    setLocalReplyTo(agentDefaults.replyTo || agentDefaults.addresses[0] || '');
  };

  const handleResetToAgent = (field: SenderFieldKey) => {
    if (field === 'name') {
      setLocalName('');
      setLinkState((prev) => ({ ...prev, nameLinked: true }));

      return;
    }

    if (field === 'email') {
      setLocalEmail('');
      setEmailError('');
      setLinkState((prev) => ({ ...prev, emailLinked: true }));

      return;
    }

    setLocalReplyTo('');
    setLinkState((prev) => ({ ...prev, replyToLinked: true }));
  };

  const handleSave = async () => {
    if (!emailDisabled && localEmail && !isValidSenderEmail(localEmail)) {
      setEmailError('Please enter a valid email address');

      return;
    }

    const payload = buildSenderConfigSavePayload({
      hasAgent,
      useProviderDefaults: localUseProviderDefaults,
      linkState,
      localName,
      localEmail,
      localReplyTo,
      localPreheader,
    });

    setValue('useProviderDefaults', payload.useProviderDefaults, { shouldDirty: true });
    setValue('from', payload.from, { shouldDirty: true });
    setValue('replyTo', payload.replyTo, { shouldDirty: true });
    setValue('preheader', payload.preheader, { shouldDirty: true });

    await saveForm({ forceSubmit: true });
    onOpenChange(false);
  };

  const handleReplyToChange = (value: string) => {
    if (hasAgent && linkState.replyToLinked) {
      setLinkState((prev) => ({ ...prev, replyToLinked: false }));
    }

    setLocalReplyTo(value);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[400px] flex-col p-0 sm:max-w-[400px]">
        <SheetHeader className="space-y-1 px-3 py-4">
          <SheetTitle className="text-label-lg mb-0 flex items-center gap-2">Sender configuration</SheetTitle>
          <SheetDescription className="text-paragraph-xs mt-0 hidden">
            Configure the sender name and email address for this email step.
          </SheetDescription>
        </SheetHeader>
        <Separator />

        <SheetMain className="space-y-4 p-3">
          <div className="rounded-4 mt-1.5 flex items-center justify-between bg-white">
            <div className="text-text-strong text-label-xs flex items-center gap-1">
              Use provider defaults
              <Tooltip>
                <TooltipTrigger className="flex cursor-default flex-row items-center gap-1">
                  <RiInformation2Line className="size-3 text-neutral-400" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px]">
                  <p>
                    When enabled, the email uses the sender name and email from your configured email integration,
                    skipping workflow agent defaults.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Switch
              checked={localUseProviderDefaults}
              onCheckedChange={handleToggleProviderDefaults}
              disabled={disabled}
            />
          </div>
          <Separator />

          <div className="space-y-3">
            <FormItem>
              <FormLabel className="flex items-center justify-between gap-1">
                <span className="flex items-center gap-1">
                  Sender name
                  <Tooltip>
                    <TooltipTrigger className="flex cursor-default flex-row items-center gap-1">
                      <RiInformation2Line className="size-3 text-neutral-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>The display name shown in the recipient&apos;s inbox.</p>
                    </TooltipContent>
                  </Tooltip>
                </span>
                {showAgentFieldActions ? (
                  <FieldAgentAction
                    linked={linkState.nameLinked}
                    onUnlink={() => handleUnlink('name')}
                    onReset={() => handleResetToAgent('name')}
                  />
                ) : null}
              </FormLabel>
              <FormControl>
                <InputRoot>
                  <InputWrapper className="flex h-[2.35rem] items-center px-0">
                    <ControlInput
                      placeholder={namePlaceholder}
                      disabled={nameDisabled}
                      value={displayedName}
                      onChange={setLocalName}
                      variables={variables}
                      isAllowedVariable={isAllowedVariable}
                      size="sm"
                      indentWithTab={false}
                      enableTranslations
                    />
                  </InputWrapper>
                </InputRoot>
              </FormControl>
            </FormItem>

            <FormItem>
              <FormLabel className="flex items-center justify-between gap-1">
                <span className="flex items-center gap-1">
                  Sender email
                  <Tooltip>
                    <TooltipTrigger className="flex cursor-default flex-row items-center gap-1">
                      <RiInformation2Line className="size-3 text-neutral-400" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[280px]">
                      <p>
                        The email address shown as &quot;From&quot; in the received email. Make sure this email is part
                        of your provider&apos;s authenticated domain.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </span>
                {showAgentFieldActions ? (
                  <FieldAgentAction
                    linked={linkState.emailLinked}
                    onUnlink={() => handleUnlink('email')}
                    onReset={() => handleResetToAgent('email')}
                  />
                ) : null}
              </FormLabel>
              <FormControl>
                <InputRoot hasError={!!emailError}>
                  <InputWrapper className="flex h-[2.35rem] items-center px-0">
                    <ControlInput
                      placeholder={emailPlaceholder}
                      disabled={emailDisabled}
                      value={displayedEmail}
                      onChange={(newEmail) => {
                        setLocalEmail(newEmail);
                        if (emailError && (!newEmail || isValidSenderEmail(newEmail))) {
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
              {emailError ? <FormMessage>{emailError}</FormMessage> : null}
            </FormItem>

            <FormItem>
              <FormLabel className="flex items-center justify-between gap-1">
                <span className="flex items-center gap-1">
                  Reply-to
                  <Tooltip>
                    <TooltipTrigger className="flex cursor-default flex-row items-center gap-1">
                      <RiInformation2Line className="size-3 text-neutral-400" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[280px]">
                      <p>The address used when recipients reply to this email.</p>
                    </TooltipContent>
                  </Tooltip>
                </span>
                {showReplyToAgentAction ? (
                  <FieldAgentAction
                    linked={linkState.replyToLinked}
                    onUnlink={() => handleUnlink('replyTo')}
                    onReset={() => handleResetToAgent('replyTo')}
                  />
                ) : null}
              </FormLabel>
              <FormControl>
                <InputRoot>
                  <InputWrapper className="flex h-[2.35rem] items-center px-0">
                    <ControlInput
                      placeholder={replyToPlaceholder}
                      disabled={disabled}
                      value={displayedReplyTo}
                      onChange={handleReplyToChange}
                      variables={variables}
                      isAllowedVariable={isAllowedVariable}
                      size="sm"
                      indentWithTab={false}
                    />
                  </InputWrapper>
                </InputRoot>
              </FormControl>
              {hasAgent && linkState.replyToLinked ? (
                <div className="text-text-soft text-label-xs flex items-center gap-0.5">
                  <RiInformation2Line className="size-4 shrink-0" />
                  <p className="leading-4">
                    Set via <span className="text-text-sub">Agent</span>.{' '}
                    <a
                      href={AGENT_TRIGGER_DOCS_URL}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-0.5 hover:underline"
                    >
                      Read docs
                      <RiExternalLinkLine className="size-3" />
                    </a>
                  </p>
                </div>
              ) : null}
            </FormItem>
          </div>

          <Separator />

          <FormItem>
            <FormLabel className="flex items-center gap-1">
              Preheader text
              <Tooltip>
                <TooltipTrigger className="flex cursor-default flex-row items-center gap-1">
                  <RiInformation2Line className="size-3 text-neutral-400" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px]">
                  <p>One-line summary shown next to the subject in the recipient&apos;s inbox.</p>
                </TooltipContent>
              </Tooltip>
            </FormLabel>
            <FormControl>
              <InputRoot className="min-h-[96px] items-start">
                <ControlInput
                  placeholder="One-line summary shown next to the subject"
                  disabled={disabled}
                  value={localPreheader}
                  onChange={setLocalPreheader}
                  variables={variables}
                  isAllowedVariable={isAllowedVariable}
                  size="2xs"
                  multiline
                  indentWithTab={false}
                  enableTranslations
                />
              </InputRoot>
            </FormControl>
          </FormItem>
        </SheetMain>

        {!disabled && (
          <>
            <Separator />
            <SheetFooter className="border-neutral-content-weak flex border-t px-3 py-1.5">
              <Button size="xs" mode="gradient" variant="secondary" onClick={handleSave}>
                Save changes
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function FieldAgentAction({
  linked,
  onUnlink,
  onReset,
}: {
  linked: boolean;
  onUnlink: () => void;
  onReset: () => void;
}) {
  if (linked) {
    return (
      <button
        type="button"
        onClick={onUnlink}
        className="text-text-soft hover:text-text-sub inline-flex size-4 items-center justify-center"
        aria-label="Override agent default"
      >
        <RiLinkM className="size-3.5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onReset}
      className="text-text-sub hover:text-text-strong inline-flex items-center gap-1 text-label-xs font-medium"
    >
      <RiArrowGoBackLine className="size-3.5" />
      Reset to Agent defaults
    </button>
  );
}
