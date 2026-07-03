import { ChatProviderIdEnum } from '@novu/shared';
import { useState } from 'react';
import { RiAddLine, RiLink } from 'react-icons/ri';
import { requestTelegramSubscriberLink } from '@/api/agents';
import { generateConnectOAuthUrl, generateLinkUserOAuthUrl } from '@/api/integrations';
import { AddButton } from '@/components/primitives/add-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/primitives/dropdown-menu';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';
import { cn } from '@/utils/ui';
import type { ChatEndpointTypeOption } from './chat-endpoint-types';
import { supportsConnectLink } from './chat-endpoint-types';

const iconButtonClassName = 'p-0.5 hover:bg-transparent';

const menuContentClassName = cn(
  'flex min-w-0 w-40 flex-col gap-0.5 rounded-lg border-0 bg-bg-white p-1 shadow-none',
  'shadow-[0px_0px_0px_1px_rgba(0,0,0,0.08),0px_4px_8px_0px_rgba(0,0,0,0.08),0px_8px_16px_0px_rgba(0,0,0,0.08)]'
);

const menuItemClassName = cn(
  'relative flex w-full cursor-pointer select-none items-center gap-1 rounded-lg px-1.5 py-1',
  'text-label-xs font-medium leading-4 text-text-sub outline-hidden transition-colors',
  'focus:bg-bg-weak data-[highlighted]:bg-bg-weak',
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  '[&>svg]:size-3.5'
);

type AddCredentialDropdownProps = {
  displayName: string;
  providerId: string;
  integrationIdentifier: string;
  connectionIdentifier?: string;
  subscriberId: string;
  options: ChatEndpointTypeOption[];
  onSelect: (option: ChatEndpointTypeOption) => void;
};

export function AddCredentialDropdown({
  displayName,
  providerId,
  integrationIdentifier,
  connectionIdentifier,
  subscriberId,
  options,
  onSelect,
}: AddCredentialDropdownProps) {
  const { currentEnvironment } = useEnvironment();
  const [isCopying, setIsCopying] = useState(false);
  const hasConnectLink = supportsConnectLink(providerId);
  const useDropdown = options.length > 1 || hasConnectLink;

  async function handleCopyConnectLink() {
    const environment = currentEnvironment;

    if (!environment || isCopying) {
      return;
    }

    setIsCopying(true);

    try {
      let url: string;

      if (providerId === ChatProviderIdEnum.Telegram) {
        const link = await requestTelegramSubscriberLink(environment, integrationIdentifier, subscriberId);

        url = link.deepLinkUrl;
      } else if (connectionIdentifier) {
        url = await generateLinkUserOAuthUrl({
          environment,
          integrationIdentifier,
          subscriberId,
          connectionIdentifier,
        });
      } else {
        url = await generateConnectOAuthUrl({
          environment,
          integrationIdentifier,
          subscriberId,
          autoLinkUser: true,
        });
      }

      await navigator.clipboard.writeText(url);
      showSuccessToast('Connect link copied');
    } catch {
      showErrorToast('Failed to copy connect link');
    } finally {
      setIsCopying(false);
    }
  }

  if (!useDropdown) {
    return (
      <AddButton
        size="2xs"
        className={iconButtonClassName}
        tooltip="Add credential"
        aria-label={`Add ${displayName} credential`}
        onClick={() => onSelect(options[0])}
      />
    );
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Add ${displayName} credential`}
          className={cn(
            'inline-flex cursor-pointer select-none items-center justify-center outline-hidden',
            'text-text-sub transition duration-200 ease-out',
            iconButtonClassName
          )}
        >
          <RiAddLine className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" withPortal={false} className={menuContentClassName}>
        <span className="text-subheading-2xs uppercase text-text-soft px-1 py-1">Add credentials</span>
        {options.map((option) => {
          const Icon = option.icon;

          return (
            <DropdownMenuItem
              key={`${option.type}-${option.label}`}
              className={menuItemClassName}
              onSelect={() => onSelect(option)}
            >
              <Icon className="size-3.5 shrink-0 text-text-sub" aria-hidden />
              <span className="whitespace-nowrap">{option.label}</span>
            </DropdownMenuItem>
          );
        })}
        {hasConnectLink ? (
          <>
            <div className="flex w-full items-center justify-center py-[3.5px]">
              <div className="bg-stroke-weak h-px w-full" />
            </div>
            <DropdownMenuItem
              className={menuItemClassName}
              disabled={isCopying}
              onSelect={() => {
                void handleCopyConnectLink();
              }}
            >
              <RiLink className="size-3.5 shrink-0 text-text-sub" aria-hidden />
              <span className="whitespace-nowrap">Copy connect link</span>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
