import { Button } from '@/components/primitives/button';
import { IProviderConfig } from '@novu/shared';
import { RiArrowRightSLine } from 'react-icons/ri';
import { ProviderIcon } from './provider-icon';

type IntegrationListItemProps = {
  integration: IProviderConfig;
  onClick: () => void;
};

export function IntegrationListItem({ integration, onClick }: IntegrationListItemProps) {
  return (
    <Button
      variant="secondary"
      onClick={onClick}
      mode="outline"
      className="group flex h-[48px] w-full items-start justify-start gap-3 border-neutral-100 p-3 hover:bg-white"
    >
      <div className="flex w-full items-start justify-start gap-3">
        <div>
          <ProviderIcon providerId={integration.id} providerDisplayName={integration.displayName} />
        </div>
        <div className="text-md text-foreground-950 leading-6">{integration.displayName}</div>
        <Button
          variant="secondary"
          mode="outline"
          size="2xs"
          onClick={onClick}
          trailingIcon={RiArrowRightSLine}
          className="ml-auto flex h-[24px] min-w-[82px] flex-row opacity-0 transition-opacity group-hover:opacity-100"
        >
          Connect
        </Button>
      </div>
    </Button>
  );
}
