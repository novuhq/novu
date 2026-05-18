import { RiCloseLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { type DomainResponse } from '@/api/domains';
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
  const { currentEnvironment } = useEnvironment();
  const domainsPath = currentEnvironment?.slug
    ? buildRoute(ROUTES.DOMAINS, { environmentSlug: currentEnvironment.slug })
    : ROUTES.INTEGRATIONS;

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
    </div>
  );
}
