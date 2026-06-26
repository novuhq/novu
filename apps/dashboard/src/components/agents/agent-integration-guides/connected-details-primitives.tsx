import { type ReactNode, useId } from 'react';
import type { IconType } from 'react-icons';
import { RiInformationLine } from 'react-icons/ri';
import { CopyButton } from '@/components/primitives/copy-button';
import { Input } from '@/components/primitives/input';
import { SecretInput } from '@/components/primitives/secret-input';
import { Skeleton } from '@/components/primitives/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';

/**
 * Read-only field / section primitives shared by the connected-channel detail views
 * (e.g. Slack and Telegram agent integration "connected" pages). Kept provider-agnostic so each
 * connected-details view only declares its provider-specific fields.
 */

function FieldLabel({
  htmlFor,
  label,
  required,
  info,
}: {
  htmlFor: string;
  label: string;
  required?: boolean;
  info?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="text-text-sub text-label-xs flex items-center gap-1 font-medium leading-5">
      <span>{label}</span>
      {required ? <span className="text-error-base">*</span> : null}
      {info ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-text-soft inline-flex cursor-help items-center">
              <RiInformationLine className="size-3.5" aria-hidden />
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{info}</TooltipContent>
        </Tooltip>
      ) : null}
    </label>
  );
}

export function ReadOnlyField({
  label,
  value,
  required,
  info,
  secret,
  copyable,
  mono = true,
}: {
  label: string;
  value: string;
  required?: boolean;
  info?: string;
  secret?: boolean;
  copyable?: boolean;
  mono?: boolean;
}) {
  const fieldId = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={fieldId} label={label} required={required} info={info} />
      {secret ? (
        <SecretInput id={fieldId} value={value} onChange={() => {}} readOnly size="2xs" className="font-mono" />
      ) : (
        <Input
          id={fieldId}
          value={value}
          readOnly
          size="2xs"
          className={cn(mono && 'font-mono')}
          trailingNode={copyable && value ? <CopyButton valueToCopy={value} className="p-1" size="2xs" /> : null}
        />
      )}
    </div>
  );
}

export function FieldSkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full rounded-10" />
    </div>
  );
}

export function DetailSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[10px] bg-bg-weak flex flex-col p-1">
      <div className="flex items-center justify-between gap-2 py-2 px-1">
        <h3 className="text-text-soft text-code-xs font-normal uppercase tracking-wider">{title}</h3>
        {action}
      </div>
      <div className="bg-bg-white flex flex-col gap-5 overflow-hidden rounded-md shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)] p-4">
        {children}
      </div>
    </section>
  );
}

export function SectionLinkButton({
  icon: Icon,
  iconPosition = 'trailing',
  children,
  onClick,
  href,
}: {
  icon: IconType;
  iconPosition?: 'leading' | 'trailing';
  children: ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const content = (
    <>
      {iconPosition === 'leading' ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
      <span>{children}</span>
      {iconPosition === 'trailing' ? <Icon className="size-3 shrink-0" aria-hidden /> : null}
    </>
  );

  const className =
    'text-text-sub hover:text-text-strong text-label-xs inline-flex items-center gap-1 font-medium leading-4 transition-colors';

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
