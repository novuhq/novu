import { RiBookMarkedLine, RiSparkling2Line } from 'react-icons/ri';
import { Link, useNavigate } from 'react-router-dom';
import { LinkButton } from '@/components/primitives/button-link';
import { IS_SELF_HOSTED, SELF_HOSTED_UPGRADE_REDIRECT_URL } from '@/config';
import { useTelemetry } from '@/hooks/use-telemetry';
import { ROUTES } from '@/utils/routes';
import { TelemetryEvent } from '@/utils/telemetry';
import { openInNewTab } from '@/utils/url';
import { Button } from '../primitives/button';

const EmptyVariablesIllustration = () => {
  return (
    <svg width="137" height="126" viewBox="0 0 137 126" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="79.5" width="136" height="46" rx="8" stroke="#CACFD8" strokeDasharray="5 3" />
      <rect x="4.5" y="83.5" width="128" height="38" rx="5.5" fill="white" />
      <rect x="4.5" y="83.5" width="128" height="38" rx="5.5" stroke="#F2F5F8" />
      <rect x="14" y="97" width="36" height="5" rx="2.5" fill="#E1E4EA" />
      <rect x="56" y="97" width="26" height="5" rx="2.5" fill="#E1E4EA" />
      <rect x="88" y="97" width="40" height="5" rx="2.5" fill="#E1E4EA" />
      <rect x="0.5" y="0.5" width="136" height="46" rx="8" stroke="#DD2450" />
      <rect x="4.5" y="4.5" width="128" height="38" rx="5.5" fill="white" />
      <rect x="4.5" y="4.5" width="128" height="38" rx="5.5" stroke="#FB3748" strokeOpacity="0.24" />
      <text x="14" y="20" fontSize="7" fill="#99A0AE" fontFamily="monospace">
        KEY
      </text>
      <text x="60" y="20" fontSize="7" fill="#99A0AE" fontFamily="monospace">
        VALUE
      </text>
      <text x="14" y="32" fontSize="7" fontFamily="monospace">
        <tspan fill="#D82651">API_KEY</tspan>
        <tspan fill="#99A0AE"> = </tspan>
        <tspan fill="#D82651">••••••••</tspan>
      </text>
      <line x1="68.5" y1="49.5" x2="68.5" y2="77.5" stroke="#CACFD8" strokeWidth="1.33" strokeDasharray="5 3" />
    </svg>
  );
};

export const VariableListUpgradeCta = () => {
  const track = useTelemetry();
  const navigate = useNavigate();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6">
      <EmptyVariablesIllustration />

      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-text-sub text-label-md block font-medium">
          One config is good. Environment-aware variables? Better.
        </span>
        <p className="text-text-soft text-paragraph-sm max-w-[60ch]">
          Unlock environment variables to manage secrets and config values across your environments without changing
          code.
        </p>
      </div>

      <div className="flex flex-col items-center gap-1">
        <Button
          variant="primary"
          mode="gradient"
          size="xs"
          className="mb-3.5"
          onClick={() => {
            track(TelemetryEvent.UPGRADE_TO_TEAM_TIER_CLICK, {
              source: 'variables-page',
            });

            if (IS_SELF_HOSTED) {
              openInNewTab(SELF_HOSTED_UPGRADE_REDIRECT_URL + '?utm_campaign=variables');
            } else {
              navigate(ROUTES.SETTINGS_BILLING);
            }
          }}
          leadingIcon={RiSparkling2Line}
        >
          {IS_SELF_HOSTED ? 'Contact Sales' : 'Upgrade now'}
        </Button>
        <Link to="https://docs.novu.co/platform/variables" target="_blank">
          <LinkButton size="sm" leadingIcon={RiBookMarkedLine}>
            How does this help?
          </LinkButton>
        </Link>
      </div>
    </div>
  );
};
