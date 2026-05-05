import { RiArrowRightSLine, RiBookMarkedLine } from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';
import { Button } from '../primitives/button';
import { cn } from '@/utils/ui';

function ProductionIllustration() {
  return (
    <svg width="136" height="125" viewBox="0 0 136 125" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="79.5" width="135" height="45" rx="7.5" stroke="#7D52F4" strokeOpacity="0.1" />
      <rect x="2.5" y="81.5" width="131" height="41" rx="5.5" fill="white" />
      <rect x="2.5" y="81.5" width="131" height="41" rx="5.5" stroke="#7D52F4" />
      <path
        d="M67.3996 102L63.157 106.243L62.3086 105.394L65.7028 102L62.3086 98.6059L63.157 97.7581L67.3996 102ZM67.3996 106.2H73.3996V107.4H67.3996V106.2Z"
        fill="#7D52F4"
      />
      <rect x="0.5" y="0.5" width="135" height="45" rx="7.5" stroke="#E1E4EA" strokeDasharray="5 3" />
      <rect x="2.5" y="2.5" width="131" height="41" rx="5.5" fill="white" />
      <rect x="2.5" y="2.5" width="131" height="41" rx="5.5" stroke="#CACFD8" />
      <path
        d="M69.4528 23.375C69.3693 23.6968 69.1814 23.9818 68.9185 24.1853C68.6555 24.3888 68.3325 24.4992 68 24.4992C67.6675 24.4992 67.3445 24.3888 67.0815 24.1853C66.8186 23.9818 66.6307 23.6968 66.5473 23.375H64.625V22.625H66.5473C66.6307 22.3031 66.8186 22.0181 67.0815 21.8146C67.3445 21.6111 67.6675 21.5007 68 21.5007C68.3325 21.5007 68.6555 21.6111 68.9185 21.8146C69.1814 22.0181 69.3693 22.3031 69.4528 22.625H71.375V23.375H69.4528Z"
        fill="#99A0AE"
      />
      <path
        d="M68.665 46V45.335H67.335V46H68H68.665ZM67.335 69.185L64.604 75.0671C64.4203 75.3852 64.68 75.835 65.0473 75.835H70.9527C71.32 75.835 71.5797 75.3852 71.396 75.0671L68.665 69.185H67.335ZM68 46H67.335V69.85H68H68.665V46H68Z"
        fill="#E1E4EA"
      />
    </svg>
  );
}

export function AgentsProductionEmptyState() {
  const navigate = useNavigate();
  const { oppositeEnvironment } = useEnvironment();

  const handleSwitchToDevelopment = () => {
    if (!oppositeEnvironment?.slug) return;
    navigate(buildRoute(ROUTES.AGENTS, { environmentSlug: oppositeEnvironment.slug }));
  };

  return (
    <div className="flex min-h-[min(720px,calc(100vh-8rem))] flex-col items-center justify-center px-4 py-10">
      <div className="flex flex-col items-center gap-12">
        <ProductionIllustration />

        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-label-md font-medium text-text-strong">No agents in production</p>
            <p className="text-paragraph-sm max-w-[500px] text-text-soft">
              To promote agents to production: switch to Development, click &apos;Publish changes&apos;, then follow the
              setup instructions.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://docs.novu.co/agents"
              target="_blank"
              rel="noreferrer"
              className={cn(
                'text-label-sm flex items-center gap-1 rounded-lg p-1.5 text-text-sub underline',
                'transition-colors hover:text-text-strong'
              )}
            >
              <RiBookMarkedLine className="size-4 shrink-0" aria-hidden />
              View docs
            </a>

            <Button
              variant="secondary"
              mode="gradient"
              size="xs"
              trailingIcon={RiArrowRightSLine}
              onClick={handleSwitchToDevelopment}
            >
              Switch to development
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
