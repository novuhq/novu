import { DomainStatusEnum } from '@novu/shared';
import { useState } from 'react';
import { RiAddLine, RiCloseLine, RiExpandUpDownLine, RiSearchLine } from 'react-icons/ri';
import { Link, useNavigate } from 'react-router-dom';
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
import { type ConfiguredAddress } from './use-email-setup-credentials';

export function InboundAddressConfig({
  configuredAddresses,
  domains,
  onAddAddress,
  onRemoveAddress,
}: {
  configuredAddresses: ConfiguredAddress[];
  domains: DomainResponse[];
  onAddAddress: (address: string, domain: DomainResponse) => void;
  onRemoveAddress: (address: string, domainId: string) => void;
}) {
  const [localPart, setLocalPart] = useState('');
  const [domainName, setDomainName] = useState('');
  const [domainOpen, setDomainOpen] = useState(false);
  const { currentEnvironment } = useEnvironment();
  const navigate = useNavigate();

  const domainsPath = currentEnvironment?.slug
    ? buildRoute(ROUTES.DOMAINS, { environmentSlug: currentEnvironment.slug })
    : ROUTES.INTEGRATIONS;

  const verifiedDomains = domains.filter((d) => d.status === DomainStatusEnum.VERIFIED && d.mxRecordConfigured);

  const LOCAL_PART_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;

  function handleAdd() {
    const trimmed = localPart.trim();
    if (!trimmed || !domainName) return;
    if (!LOCAL_PART_RE.test(trimmed)) return;
    const domain = domains.find((d) => d.name === domainName);
    if (!domain) return;
    if (configuredAddresses.some((a) => a.address === trimmed && a.domain === domainName)) return;
    onAddAddress(trimmed, domain);
    setLocalPart('');
  }

  return (
    <div className="flex flex-col gap-3">
      {configuredAddresses.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {configuredAddresses.map((addr) => {
            const full = `${addr.address}@${addr.domain}`;

            return (
              <div
                key={`${addr.address}-${addr.domainId}`}
                className="border-stroke-soft bg-bg-white flex items-center gap-2 rounded-lg border px-2 py-1.5 shadow-xs"
              >
                <span className="text-text-sub text-label-xs flex-1 font-medium leading-4">
                  {addr.address === '*' ? `*@${addr.domain}` : full}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${full}`}
                  className="text-text-soft hover:text-destructive"
                  onClick={() => onRemoveAddress(addr.address, addr.domainId)}
                >
                  <RiCloseLine className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-1">
        <div className="border-stroke-soft bg-bg-white flex h-8 items-center overflow-hidden rounded-lg border shadow-xs">
          <input
            type="text"
            aria-label="Inbound email local part"
            className="text-text-sub text-label-xs h-full w-[120px] bg-transparent px-2 font-medium outline-none"
            placeholder="agent"
            value={localPart}
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
              className="border-stroke-soft bg-bg-white flex h-8 min-w-[180px] items-center justify-between overflow-hidden rounded-lg border px-2 shadow-xs"
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
                      navigate(domainsPath);
                    }}
                    className="flex items-center gap-2 rounded-md p-1"
                  >
                    <span className="text-text-sub text-label-xs flex-1 font-medium leading-4">Add domain</span>
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
          disabled={!localPart || !domainName}
          className="border-stroke-soft bg-bg-white flex h-8 items-center gap-1 rounded-lg border px-2 shadow-xs disabled:opacity-40"
          onClick={handleAdd}
        >
          <RiAddLine className="text-text-soft size-3.5" />
          <span className="text-text-sub text-label-xs font-medium">Add</span>
        </button>
      </div>

      <p className="text-text-soft text-label-xs font-medium leading-4">
        <Link to={domainsPath} className="text-text-sub underline">
          Configure custom domains
        </Link>
        {' by adding them to Novu. You can add multiple addresses across different domains.'}
      </p>
    </div>
  );
}
