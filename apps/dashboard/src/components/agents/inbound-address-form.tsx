import { DomainStatusEnum } from '@novu/shared';
import { useState } from 'react';
import { RiAddLine, RiExpandUpDownLine, RiSearchLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { type DomainResponse } from '@/api/domains';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/primitives/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';

/**
 * Valid local-part: bare `*` (wildcard) or lowercase dot-atom subset.
 */
const LOCAL_PART_REGEX = /^(\*|[a-z0-9._-]+)$/;

type InboundAddressFormProps = {
  domains: DomainResponse[];
  /**
   * Returns `false` to keep the form filled (used to flag duplicate
   * submissions); any other return value (including `undefined`) means the
   * parent accepted the address and we can clear the local-part input.
   */
  onSubmit: (address: string, domain: DomainResponse) => boolean | undefined;
  isDisabled?: boolean;
  isExistingAddress?: (address: string, domainId: string) => boolean;
};

/**
 * Single-row `[local-part]@[verified-domain ▾] [+ Add]` form. Extracted from
 * `InboundAddressConfig` so both the setup wizard and the post-setup inbox
 * card use the same input UX.
 */
export function InboundAddressForm({ domains, onSubmit, isDisabled, isExistingAddress }: InboundAddressFormProps) {
  const [localPart, setLocalPart] = useState('');
  const [domainName, setDomainName] = useState('');
  const [domainOpen, setDomainOpen] = useState(false);
  const { currentEnvironment } = useEnvironment();
  const navigate = useNavigate();

  const domainsPath = currentEnvironment?.slug
    ? buildRoute(ROUTES.DOMAINS, { environmentSlug: currentEnvironment.slug })
    : ROUTES.INTEGRATIONS;

  const verifiedDomains = domains.filter((d) => d.status === DomainStatusEnum.VERIFIED && d.mxRecordConfigured);

  function handleAdd() {
    if (isDisabled) return;
    const trimmed = localPart.trim();
    if (!trimmed || !domainName) return;
    if (!LOCAL_PART_REGEX.test(trimmed)) return;
    const domain = domains.find((d) => d.name === domainName);
    if (!domain) return;
    if (isExistingAddress?.(trimmed, domain._id)) return;
    const accepted = onSubmit(trimmed, domain);
    if (accepted !== false) {
      setLocalPart('');
    }
  }

  return (
    <div className="flex items-center gap-1">
      <div
        className={cn(
          'border-stroke-soft bg-bg-white flex h-8 items-center overflow-hidden rounded-lg border shadow-xs',
          isDisabled && 'opacity-60'
        )}
      >
        <input
          type="text"
          aria-label="Inbound email local part"
          className="text-text-sub text-label-xs h-full w-[120px] bg-transparent px-2 font-medium outline-none"
          placeholder="agent"
          value={localPart}
          disabled={isDisabled}
          onChange={(e) => setLocalPart(e.target.value.replace(/\s/g, ''))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
        />
      </div>
      <span className="text-text-soft text-label-xs font-medium">@</span>
      <Popover open={domainOpen} onOpenChange={setDomainOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Select inbound domain"
            disabled={isDisabled}
            className={cn(
              'border-stroke-soft bg-bg-white flex h-8 min-w-[180px] items-center justify-between overflow-hidden rounded-lg border px-2 shadow-xs',
              isDisabled && 'opacity-60'
            )}
          >
            {domainName ? (
              <span className="text-text-sub text-label-xs font-medium leading-4">{domainName}</span>
            ) : (
              <span className="text-text-soft text-label-xs font-medium leading-4">Select domain...</span>
            )}
            <RiExpandUpDownLine className="text-text-soft size-3 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="min-w-[180px] overflow-hidden p-0" align="start">
          <Command>
            <div className="bg-bg-weak border-stroke-weak flex items-center gap-2 border-b py-1.5 pl-3 pr-3">
              <CommandInput
                placeholder="Search domain"
                size="xs"
                inputRootClassName="min-w-0 flex-1 rounded-none border-none bg-transparent shadow-none divide-none before:ring-0 has-[input:focus]:shadow-none has-[input:focus]:ring-0 focus-within:shadow-none focus-within:ring-0"
                inputWrapperClassName="h-4 min-h-4 bg-transparent px-0 py-0 hover:[&:not(&:has(input:focus))]:bg-transparent has-[input:disabled]:bg-transparent"
                className="text-text-sub text-label-xs leading-4 placeholder:text-text-sub h-4 min-h-4 py-0"
              />
              <RiSearchLine className="text-text-soft size-3 shrink-0" />
            </div>
            <CommandList className="max-h-[200px] p-1">
              <CommandEmpty className="text-text-soft text-label-xs py-4">No domains found.</CommandEmpty>
              <CommandGroup
                heading="Domains"
                className="**:[[cmdk-group-heading]]:text-text-soft **:[[cmdk-group-heading]]:text-label-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:leading-4 **:[[cmdk-group-heading]]:px-1 **:[[cmdk-group-heading]]:py-1"
              >
                {verifiedDomains.map((d) => (
                  <CommandItem
                    key={d._id}
                    value={d.name}
                    onSelect={() => {
                      setDomainName(d.name);
                      setDomainOpen(false);
                    }}
                    className={cn('flex items-center gap-2 rounded-md p-1', d.name === domainName && 'bg-bg-muted')}
                  >
                    <span className="text-text-sub text-label-xs flex-1 font-medium leading-4">{d.name}</span>
                  </CommandItem>
                ))}
                <CommandItem
                  value="__add_domain__"
                  onSelect={() => {
                    setDomainOpen(false);
                    void navigate(domainsPath);
                  }}
                  className="flex items-center gap-2 rounded-md p-1"
                >
                  <span className="text-text-sub text-label-xs flex-1 font-medium leading-4">Add custom domain</span>
                  <RiAddLine className="text-text-soft size-3 shrink-0" />
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <button
        type="button"
        aria-label="Add inbound address"
        disabled={isDisabled || !localPart || !domainName}
        className="border-stroke-soft bg-bg-white flex h-8 items-center gap-1 rounded-lg border px-2 shadow-xs disabled:opacity-40"
        onClick={handleAdd}
      >
        <RiAddLine className="text-text-soft size-3.5" />
        <span className="text-text-sub text-label-xs font-medium">Add</span>
      </button>
    </div>
  );
}
