import { Button } from '@/components/primitives/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormMessagePure,
} from '@/components/primitives/form/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { Separator } from '@/components/primitives/separator';
import { URLInput } from '@/components/workflow-editor/url-input';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { inboxButtonVariants } from '@/utils/inbox';
import { cn } from '@/utils/ui';
import { urlTargetTypes } from '@/utils/url';
import merge from 'lodash.merge';
import { ComponentProps } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { RiEdit2Line, RiExpandUpDownLine, RiForbid2Line } from 'react-icons/ri';
import { CompactButton } from './primitives/button-compact';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { InputRoot } from './primitives/input';

const primaryActionKey = 'primaryAction';
const secondaryActionKey = 'secondaryAction';

export const InAppActionDropdown = ({ onMenuItemClick }: { onMenuItemClick?: () => void }) => {
  const { control, setValue, getFieldState } = useFormContext();

  const primaryAction = useWatch({ control, name: primaryActionKey });
  const secondaryAction = useWatch({ control, name: secondaryActionKey });
  const primaryActionLabel = getFieldState(`${primaryActionKey}.label`);
  const primaryActionRedirectUrl = getFieldState(`${primaryActionKey}.redirect.url`);
  const secondaryActionLabel = getFieldState(`${secondaryActionKey}.label`);
  const secondaryActionRedirectUrl = getFieldState(`${secondaryActionKey}.redirect.url`);
  const error =
    primaryActionLabel.error ||
    primaryActionRedirectUrl.error ||
    secondaryActionLabel.error ||
    secondaryActionRedirectUrl.error;

  return (
    <>
      <DropdownMenu modal={false}>
        <div className={cn('mt-3 flex items-center gap-1')}>
          <div className="border-neutral-alpha-200 shadow-input relative flex min-h-10 w-full flex-wrap items-center justify-end gap-1 rounded-md border bg-white p-1">
            {!primaryAction && !secondaryAction && (
              <Button
                variant="secondary"
                mode="outline"
                size="2xs"
                className={inboxButtonVariants({
                  variant: 'secondary',
                  className: 'border-[1px] border-dashed shadow-none ring-0',
                })}
                trailingIcon={RiForbid2Line}
                tabIndex={-1}
              >
                No action
              </Button>
            )}
            {primaryAction && (
              <ConfigureActionPopover title="Primary action" asChild fields={{ actionKey: primaryActionKey }}>
                <button
                  className={inboxButtonVariants({
                    variant: 'default',
                    className: 'z-10 h-6 min-w-16 max-w-48 truncate',
                  })}
                >
                  {primaryAction.label || 'Primary action'}
                </button>
              </ConfigureActionPopover>
            )}
            {secondaryAction && (
              <ConfigureActionPopover title="Secondary action" asChild fields={{ actionKey: secondaryActionKey }}>
                <button
                  className={inboxButtonVariants({
                    variant: 'secondary',
                    className: 'z-10 h-6 min-w-16 max-w-48 truncate',
                  })}
                >
                  {secondaryAction.label || 'Secondary action'}
                </button>
              </ConfigureActionPopover>
            )}
            <DropdownMenuTrigger className="absolute size-full" tabIndex={-1} />
          </div>
          <DropdownMenuTrigger asChild>
            <CompactButton
              icon={RiExpandUpDownLine}
              size="lg"
              variant="ghost"
              data-testid="in-app-action-dropdown-trigger"
            >
              <span className="sr-only">Actions</span>
            </CompactButton>
          </DropdownMenuTrigger>
        </div>
        <DropdownMenuContent
          className="p-1"
          align="end"
          onBlur={(e) => {
            // weird behaviour but onBlur event happens when hovering over the menu items, this is used to prevent
            // the blur event that submits the form
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <DropdownMenuItem
            onClick={() => {
              setValue(primaryActionKey, null, { shouldDirty: true, shouldValidate: true });
              setValue(secondaryActionKey, null, { shouldDirty: true, shouldValidate: true });
              onMenuItemClick?.();
            }}
          >
            <Button
              mode="outline"
              variant="secondary"
              size="2xs"
              className={inboxButtonVariants({
                variant: 'secondary',
                className: 'h-6 border-[1px] border-dashed shadow-none ring-0',
              })}
              trailingIcon={RiForbid2Line}
            >
              No action
            </Button>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const primaryActionValue = merge(
                {
                  label: 'Primary action',
                  redirect: { target: '_self', url: '' },
                },
                primaryAction
              );
              setValue(primaryActionKey, primaryActionValue, { shouldDirty: true, shouldValidate: true });
              setValue(secondaryActionKey, null, { shouldDirty: true, shouldValidate: true });
              onMenuItemClick?.();
            }}
          >
            <button
              className={inboxButtonVariants({
                variant: 'default',
                className: 'z-10 h-6 min-w-16 max-w-48 truncate',
              })}
            >
              Primary action
            </button>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const primaryActionValue = merge(
                {
                  label: 'Primary action',
                  redirect: { target: '_self', url: '' },
                },
                primaryAction
              );
              const secondaryActionValue = {
                label: 'Secondary action',
                redirect: { target: '_self', url: '' },
              };
              setValue(primaryActionKey, primaryActionValue, { shouldDirty: true, shouldValidate: true });
              setValue(secondaryActionKey, secondaryActionValue, { shouldDirty: true, shouldValidate: true });
              onMenuItemClick?.();
            }}
          >
            <>
              <button
                className={inboxButtonVariants({
                  variant: 'default',
                  className: 'z-10 h-6 min-w-16 max-w-48 truncate',
                })}
              >
                Primary action
              </button>
              <button className={inboxButtonVariants({ variant: 'secondary', className: 'pointer-events-none h-6' })}>
                Secondary action
              </button>
            </>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* TODO: Use <FormMessage /> instead, see how we did it in <URLInput /> */}
      {error && <FormMessagePure hasError={!!error}>{String(error?.message || '')}</FormMessagePure>}
    </>
  );
};

const ConfigureActionPopover = (
  props: ComponentProps<typeof PopoverTrigger> & { title: string; fields: { actionKey: string } }
) => {
  const {
    title,
    fields: { actionKey },
    ...rest
  } = props;
  const { control } = useFormContext();
  const { step, digestStepBeforeCurrent } = useWorkflow();
  const { variables, isAllowedVariable } = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);

  return (
    <Popover>
      <PopoverTrigger {...rest} />
      <PopoverContent className="max-w-72 overflow-visible" side="bottom" align="end">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-medium leading-none">
            <RiEdit2Line className="size-4" /> {title}
          </div>
          <Separator />
          <FormField
            control={control}
            name={`${actionKey}.label`}
            defaultValue=""
            render={({ field, fieldState }) => (
              <FormItem>
                <div className="flex items-center gap-1">
                  <FormLabel>Button text</FormLabel>
                </div>
                <FormControl>
                  <InputRoot className="overflow-visible" hasError={!!fieldState.error}>
                    <ControlInput
                      variables={variables}
                      isAllowedVariable={isAllowedVariable}
                      multiline={false}
                      indentWithTab={false}
                      placeholder={title}
                      value={field.value}
                      onChange={field.onChange}
                      enableTranslations
                    />
                  </InputRoot>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div>
            <FormLabel className="mb-1">Redirect URL</FormLabel>
            <URLInput
              options={urlTargetTypes}
              fields={{
                urlKey: `${actionKey}.redirect.url`,
                targetKey: `${actionKey}.redirect.target`,
              }}
              variables={variables}
              isAllowedVariable={isAllowedVariable}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
