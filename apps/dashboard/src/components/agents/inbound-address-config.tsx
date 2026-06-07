import { RiAtLine, RiCloseLine, RiInformation2Line } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { type DomainResponse } from '@/api/domains';
import { CopyButton } from '@/components/primitives/copy-button';
import { Input } from '@/components/primitives/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';
import { InboundAddressForm } from './inbound-address-form';
import { type ConfiguredAddress } from './use-email-setup-credentials';

/**
 * Setup-wizard variant of the inbound-address manager: shows the configured
 * routes as removable chips and the shared add-form. The post-setup view
 * (`EmailInboxCardBody`) renders a richer list-manager with primary radios +
 * the shared inbox toggle, but reuses the same `InboundAddressForm`.
 */
export function InboundAddressConfig({
  sharedInboundAddress,
  configuredAddresses,
  domains,
  onAddAddress,
  onRemoveAddress,
  hideCustomAddressForm = false,
}: {
  /** Server-provisioned default inbox (e.g. the demo email `…@agentconnect.sh` address). */
  sharedInboundAddress?: string;
  configuredAddresses: ConfiguredAddress[];
  domains: DomainResponse[];
  onAddAddress: (address: string, domain: DomainResponse) => void;
  onRemoveAddress: (address: string, domainId: string) => void;
  /**
   * Onboarding hides the custom-address add-form and the domains link: the shared inbox is
   * enough to get started, and the helper note tells users custom domains can be set up later.
   */
  hideCustomAddressForm?: boolean;
}) {
  const { currentEnvironment } = useEnvironment();
  const domainsPath = currentEnvironment?.slug
    ? buildRoute(ROUTES.DOMAINS, { environmentSlug: currentEnvironment.slug })
    : ROUTES.INTEGRATIONS;

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1">
          <span className="text-text-sub text-label-xs font-medium leading-4">Agent email address</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label="About the agent email address">
                <RiInformation2Line className="text-text-soft size-3.5" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Subscribers send emails to this address to reach your agent.
            </TooltipContent>
          </Tooltip>
        </div>

        {sharedInboundAddress && (
          <Input
            size="xs"
            readOnly
            aria-label="Agent email address"
            value={sharedInboundAddress}
            leadingIcon={RiAtLine}
            inlineTrailingNode={
              <CopyButton size="2xs" valueToCopy={sharedInboundAddress} className="size-6 shrink-0 justify-center" />
            }
          />
        )}

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

        <div className="text-text-soft flex items-center gap-1">
          <RiInformation2Line className="size-3.5 shrink-0" aria-hidden />
          <span className="text-label-xs font-normal leading-4">Custom domain and providers can be setup later.</span>
        </div>
      </div>

      {!hideCustomAddressForm && (
        <>
          <InboundAddressForm
            domains={domains}
            onSubmit={(address, domain) => {
              onAddAddress(address, domain);

              return true;
            }}
            isExistingAddress={(address, domainId) =>
              configuredAddresses.some((a) => a.address === address && a.domainId === domainId)
            }
          />

          <p className="text-text-soft text-label-xs font-medium leading-4 max-w-[400px]">
            <Link to={domainsPath} className="text-text-sub underline">
              Configure custom domains
            </Link>
            {' by adding them to Novu. You can add multiple addresses across different domains.'}
          </p>
        </>
      )}
    </div>
  );
}
