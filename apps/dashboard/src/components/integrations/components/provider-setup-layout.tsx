import type { IEnvironment } from '@novu/shared';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import type { ReactNode } from 'react';
import { RiAddLine, RiArrowDownSLine, RiArrowRightSLine, RiShareBoxLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/primitives/collapsible';
import { EnvironmentBranchIcon } from '@/components/primitives/environment-branch-icon';
import { cn } from '@/utils/ui';

/**
 * Building blocks of the provider setup layout in the "Connect {provider}" sheet: environment pills, the
 * setup card with Quick setup / Manual, Advanced settings and the footer. Slack uses them first; other
 * providers move to them one at a time.
 */

const CARD_SHADOW = 'shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_4px_0_rgba(0,0,0,0.04)]';

export type ProviderSetupMode = 'quick' | 'manual';

/** Picks the environment the integration is created in. */
export function EnvironmentPills({
  environments,
  selectedId,
  onSelect,
  disabled,
}: {
  environments: IEnvironment[];
  selectedId?: string;
  onSelect: (environmentId: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-label-xs text-text-strong flex-1">Environment</span>
      {environments.map((environment) => {
        const isSelected = environment._id === selectedId;

        return (
          <button
            key={environment._id}
            type="button"
            aria-pressed={isSelected}
            disabled={disabled}
            onClick={() => onSelect(environment._id)}
            className={cn(
              'text-label-xs flex h-7 shrink-0 items-center gap-1.5 rounded-lg pl-1.5 pr-2.5 transition-colors disabled:cursor-not-allowed',
              isSelected
                ? cn('bg-bg-white text-text-strong', CARD_SHADOW)
                : 'border-stroke-soft text-text-sub hover:text-text-strong border border-dashed disabled:opacity-60'
            )}
          >
            {isSelected ? (
              <EnvironmentBranchIcon environment={environment} size="xs" />
            ) : (
              <RiAddLine className="size-3.5" />
            )}
            {environment.name}
          </button>
        );
      })}
    </div>
  );
}

/** "SET UP {PROVIDER}" card: an eyebrow with the time it takes, then the setup steps on a white sheet. */
export function SetupCard({
  title,
  duration,
  mode,
  onModeChange,
  children,
  footer,
}: {
  title: string;
  duration?: string;
  /** Leave out for providers that only have one way to set up. */
  mode?: ProviderSetupMode;
  onModeChange?: (mode: ProviderSetupMode) => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="bg-bg-weak border-stroke-weak flex flex-col gap-0.5 rounded-[10px] border p-1">
      <div className="text-code-xs font-code flex items-start px-2 py-1.5 uppercase tracking-[-0.24px]">
        <span className="text-text-sub flex-1">{title}</span>
        {duration && <span className="text-text-soft shrink-0">{duration}</span>}
      </div>
      <div className={cn('bg-bg-white flex flex-col overflow-hidden rounded-md', CARD_SHADOW)}>
        {mode && onModeChange && (
          <div className="px-5 pt-4">
            <SetupModeSwitch mode={mode} onChange={onModeChange} />
          </div>
        )}
        <div className="px-5 pb-1 pt-5">{children}</div>
        {footer}
      </div>
    </section>
  );
}

function SetupModeSwitch({ mode, onChange }: { mode: ProviderSetupMode; onChange: (mode: ProviderSetupMode) => void }) {
  const options: { value: ProviderSetupMode; label: string }[] = [
    { value: 'quick', label: 'Quick setup' },
    { value: 'manual', label: 'Manual' },
  ];

  // A radio group, so arrow keys move between the modes and only the selected one is in the Tab order.
  return (
    <RadioGroupPrimitive.Root
      value={mode}
      onValueChange={(value) => onChange(value as ProviderSetupMode)}
      orientation="horizontal"
      aria-label="Setup mode"
      className="inline-flex min-w-[188px] gap-px rounded-[7px] bg-[#f4f4f5] p-px"
    >
      {options.map((option) => (
        <RadioGroupPrimitive.Item
          key={option.value}
          value={option.value}
          className={cn(
            'text-text-sub hover:text-text-strong flex h-7 flex-1 items-center justify-center whitespace-nowrap rounded-md px-4 text-[13px] font-medium leading-[1.1] transition-colors',
            'data-[state=checked]:bg-bg-white data-[state=checked]:text-text-strong',
            'data-[state=checked]:shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.08),0_2px_4px_0_rgba(0,0,0,0.04)]',
            'focus-visible:ring-stroke-strong outline-none focus-visible:ring-2'
          )}
        >
          {option.label}
        </RadioGroupPrimitive.Item>
      ))}
    </RadioGroupPrimitive.Root>
  );
}

/** The grey tip with a bar on its left, under the setup steps. */
export function SetupTip({ children }: { children: ReactNode }) {
  return (
    <div className="px-5 pb-2">
      <div className="bg-bg-weak border-stroke-weak flex items-stretch gap-3 rounded-lg border px-3 py-2.5">
        <span className="w-1 shrink-0 rounded-full bg-[#717784]" aria-hidden="true" />
        <p className="text-label-xs text-text-sub">
          <span className="text-text-strong">Tip:</span> {children}
        </p>
      </div>
    </div>
  );
}

export function SetupDocsLink({ href }: { href: string }) {
  return (
    <div className="px-[22px] py-3.5">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-label-xs text-text-sub hover:text-text-strong inline-flex items-center gap-1.5 underline"
      >
        Learn more in docs
        <RiShareBoxLine className="size-3" />
      </a>
    </div>
  );
}

/** Collapsed by default: the name, identifier and the rest of the general settings. */
export function AdvancedSettings({ children }: { children: ReactNode }) {
  return (
    <Collapsible className="bg-bg-weak border-stroke-weak group/advanced rounded-[10px] border p-1">
      <div className={cn('bg-bg-white overflow-hidden rounded-md', CARD_SHADOW)}>
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-label-sm text-text-strong">Advanced settings</span>
            <span className="text-paragraph-xs text-text-soft">Name, identifier and advanced settings.</span>
          </span>
          <RiArrowDownSLine className="text-text-sub size-4 shrink-0 transition-transform group-data-[state=open]/advanced:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-stroke-soft border-t p-3">{children}</CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/** A titled, collapsible block of settings, e.g. "SLACK APP CREDENTIALS" in the manage drawer. */
export function SettingsSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className="bg-bg-weak border-stroke-weak group/section rounded-[10px] border p-1"
    >
      <CollapsibleTrigger className="text-code-xs font-code text-text-sub flex w-full items-center px-2 py-1.5 text-left uppercase tracking-[-0.24px]">
        <span className="flex-1">{title}</span>
        <RiArrowRightSLine className="text-text-soft size-4 shrink-0 transition-transform group-data-[state=open]/section:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={cn('bg-bg-white mt-0.5 rounded-md p-3.5', CARD_SHADOW)}>{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** "Pick a different provider" on the left; Cancel and the connect action on the right. */
export function ProviderSetupFooter({
  onPickDifferentProvider,
  onCancel,
  formId,
  isSubmitting,
  canSubmit,
}: {
  onPickDifferentProvider: () => void;
  onCancel: () => void;
  /** The form the connect button submits. */
  formId: string;
  isSubmitting?: boolean;
  canSubmit: boolean;
}) {
  return (
    <div className="bg-bg-weak border-stroke-soft flex items-center gap-2 border-t px-5 py-3">
      <button
        type="button"
        onClick={onPickDifferentProvider}
        className="text-label-xs text-text-sub hover:text-text-strong flex-1 text-left underline"
      >
        Pick a different provider
      </button>
      <Button
        type="button"
        variant="secondary"
        mode="ghost"
        size="2xs"
        className="text-text-strong h-7 rounded-md px-2 text-[13px] leading-[1.1]"
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form={formId}
        variant="primary"
        mode="gradient"
        size="2xs"
        className="h-7 rounded-md px-2 text-[13px] leading-[1.1]"
        disabled={!canSubmit}
        isLoading={isSubmitting}
      >
        Connect provider
      </Button>
    </div>
  );
}
