import { IProviderConfig } from '@novu/shared';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/primitives/badge';
import { InlineToast } from '@/components/primitives/inline-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { buildRoute, ROUTES } from '@/utils/routes';
import { useProviderDeprecation } from './hooks/use-provider-deprecation';

type ProviderDeprecationProps = {
  provider: IProviderConfig;
};

export function ProviderDeprecatedBadge({ provider, className }: ProviderDeprecationProps & { className?: string }) {
  const deprecation = useProviderDeprecation(provider);

  if (!deprecation) {
    return null;
  }

  const tooltip = deprecation.replacement
    ? `Connect ${deprecation.replacement.displayName} on the Tool channel instead`
    : deprecation.reason;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={className}>
          <Badge variant="lighter" color="orange" size="sm">
            DEPRECATED
          </Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

type ProviderDeprecationNoticeProps = ProviderDeprecationProps & {
  /** Use replace when leaving a create flow so Back does not return to the deprecated provider. */
  replaceOnNavigate?: boolean;
};

export function ProviderDeprecationNotice({ provider, replaceOnNavigate = false }: ProviderDeprecationNoticeProps) {
  const navigate = useNavigate();
  const deprecation = useProviderDeprecation(provider);

  if (!deprecation) {
    return null;
  }

  const { reason, replacement } = deprecation;

  return (
    <div className="p-3">
      <InlineToast
        variant="warning"
        title={`${provider.displayName} is deprecated.`}
        description={reason}
        ctaLabel={replacement ? `Connect ${replacement.displayName}` : undefined}
        onCtaClick={
          replacement
            ? () =>
                navigate(buildRoute(ROUTES.INTEGRATIONS_CONNECT_PROVIDER, { providerId: replacement.id }), {
                  replace: replaceOnNavigate,
                })
            : undefined
        }
      />
    </div>
  );
}
