import { type IProviderConfig, PermissionsEnum } from '@novu/shared';
import { RiAddLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { PermissionButton } from '@/components/primitives/permission-button';
import { buildRoute, ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { ProviderIcon } from './provider-icon';
import { CHANNEL_LABELS } from './utils/helpers';
import { CARD_SHADOW } from './utils/store-styles';

/** A store provider the environment doesn't have yet, found by search. Adding it opens its connect form. */
export function IntegrationStoreAddCard({ provider }: { provider: IProviderConfig }) {
  const navigate = useNavigate();

  return (
    <div className={cn('bg-bg-white flex items-center gap-3 rounded-xl py-3.5 pl-3.5 pr-3', CARD_SHADOW)}>
      <div className="border-stroke-soft flex size-8 shrink-0 items-center justify-center rounded-lg border bg-[#f4f4f5] bg-[linear-gradient(180deg,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_100%)]">
        <ProviderIcon providerId={provider.id} providerDisplayName={provider.displayName} className="size-[19px]" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-label-sm text-text-strong truncate">{provider.displayName}</span>
        <span className="text-label-xs text-text-sub truncate opacity-85">{CHANNEL_LABELS[provider.channel]}</span>
      </div>
      <PermissionButton
        permission={PermissionsEnum.INTEGRATION_WRITE}
        variant="secondary"
        mode="outline"
        size="xs"
        leadingIcon={RiAddLine}
        onClick={() => navigate(buildRoute(ROUTES.INTEGRATIONS_CONNECT_PROVIDER, { providerId: provider.id }))}
      >
        Add
      </PermissionButton>
    </div>
  );
}
