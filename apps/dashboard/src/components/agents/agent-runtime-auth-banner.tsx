import { RiAlertLine, RiExternalLinkLine } from 'react-icons/ri';
import { Link } from 'react-router-dom';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';

type AgentRuntimeAuthBannerProps = {
  integrationId: string | undefined;
};

export function AgentRuntimeAuthBanner({ integrationId }: AgentRuntimeAuthBannerProps) {
  const { currentEnvironment } = useEnvironment();

  const integrationRoute =
    currentEnvironment?.slug && integrationId
      ? buildRoute(ROUTES.INTEGRATIONS_UPDATE, {
          environmentSlug: currentEnvironment.slug,
          integrationId,
        })
      : undefined;

  return (
    <div className="border-warning-300 bg-warning-50 flex items-start gap-3 border-b px-4 py-3 md:px-6">
      <RiAlertLine className="text-warning-600 mt-0.5 size-4 shrink-0" />
      <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
        <div>
          <span className="text-warning-800 text-label-sm font-semibold">Anthropic API key invalid or revoked.</span>{' '}
          <span className="text-warning-700 text-label-sm">Re-connect to continue using managed runtime features.</span>
        </div>
        {integrationRoute && (
          <Link
            to={integrationRoute}
            className="text-warning-700 hover:text-warning-900 flex shrink-0 items-center gap-1 text-label-sm font-medium"
          >
            Update key
            <RiExternalLinkLine className="size-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
