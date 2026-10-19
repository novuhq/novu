import { Link } from 'react-router-dom';
import { ROUTES } from '../../../utils/routes';
import { Badge } from '../../primitives/badge';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '../../primitives/tooltip';

export function AnalyticsUpgradeCtaIcon() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={ROUTES.SETTINGS_BILLING + '?utm_source=analytics-date-filter'}
          className="block flex items-center justify-center transition-all duration-200 hover:scale-105"
        >
          <Badge color="purple" size="sm" variant="lighter">
            Upgrade
          </Badge>
        </Link>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent>Upgrade your plan to unlock extended retention periods</TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
}
