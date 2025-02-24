import { Badge } from '@/components/primitives/badge';
import { Card } from '@/components/primitives/card';
import {
  ApiServiceLevelEnum,
  FeatureFlags,
  FeatureFlagsKeysEnum,
  FeatureNameEnum,
  getFeatureForTierAsNumber,
  getFeatureForTierAsText,
} from '@novu/shared';
import { useFlagsMap } from '@/hooks/use-feature-flag.tsx';

const serviceLevelHighlightFunctions: Record<
  string,
  ((ApiServiceLevelEnum: ApiServiceLevelEnum, activeFlags: FeatureFlags) => string)[]
> = {
  [ApiServiceLevelEnum.FREE]: [getEventsLine, getTeammatesLine, feedRetentionLine],
  [ApiServiceLevelEnum.PRO]: [getEventsLine, getTeammatesLine, feedRetentionLine],
  [ApiServiceLevelEnum.TEAM]: [getEventsLine, getTeammatesLine, feedRetentionLine],
  [ApiServiceLevelEnum.ENTERPRISE]: [getEventsLine, getTeammatesLine, getSamlText],
};

function augmentBasedOfFeatureFlags(highlightsArray: Partial<PlanHighlights>, featureFlags: FeatureFlags) {
  if (!featureFlags[FeatureFlagsKeysEnum.IS_2025_Q1_TIERING_ENABLED]) {
    delete highlightsArray[ApiServiceLevelEnum.PRO];
  }

  return highlightsArray;
}

function buildHighlightsArray(activeFlags: FeatureFlags): Partial<PlanHighlights> {
  const highlightsArray: Partial<PlanHighlights> = {};

  for (const serviceLevelKey of Object.keys(serviceLevelHighlightFunctions)) {
    const serviceLevel = serviceLevelKey as ApiServiceLevelEnum;
    const textFunctionsArray = serviceLevelHighlightFunctions[serviceLevel];

    highlightsArray[serviceLevel] = [];

    for (const serviceLevelBasedTextFunction of textFunctionsArray) {
      const highlightDisplayElement = {
        text: serviceLevelBasedTextFunction(serviceLevel, activeFlags),
      };
      highlightsArray[serviceLevel].push(highlightDisplayElement);
    }
  }

  return augmentBasedOfFeatureFlags(highlightsArray, activeFlags);
}

function PlanHighlights({ planHighlights }: { planHighlights: Highlight[] }) {
  return (
    <Card className="bg-muted/30 flex-1 border-none p-6">
      <ul className="text-muted-foreground list-inside space-y-3 text-sm">
        {planHighlights.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <div className="bg-primary h-1.5 w-1.5 rounded-full" />
            {item.text}{' '}
            {item.badgeLabel && (
              <Badge variant="stroke" color="gray">
                {item.badgeLabel}
              </Badge>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function HighlightsRow() {
  const activeFlags = useFlagsMap();
  const highlightsArray = buildHighlightsArray(activeFlags);
  const numberOfPlans = Object.keys(highlightsArray).length;
  return (
    <div className={`grid grid-cols-1 gap-6 md:grid-cols-${numberOfPlans}`}>
      {Object.entries(highlightsArray).map(([planName, planHighlights]) => (
        <PlanHighlights key={planName} planHighlights={planHighlights} />
      ))}
    </div>
  );
}

function getEventsLine(serviceLevel: ApiServiceLevelEnum) {
  const eventsAmount = getFeatureForTierAsNumber(FeatureNameEnum.PLATFORM_MONTHLY_EVENTS_INCLUDED, serviceLevel);
  const formatted: string = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(eventsAmount);
  return `Up to ${formatted} events per month`;
}

function getTeammatesLine(serviceLevel: ApiServiceLevelEnum, activeFlags: FeatureFlags) {
  const maxTeamMembers = getFeatureForTierAsText(FeatureNameEnum.ACCOUNT_MAX_TEAM_MEMBERS, serviceLevel, activeFlags);
  return `${maxTeamMembers} teammates`;
}

function feedRetentionLine(serviceLevel: ApiServiceLevelEnum, activeFlags: FeatureFlags) {
  const retention = getFeatureForTierAsText(
    FeatureNameEnum.PLATFORM_ACTIVITY_FEED_RETENTION,
    serviceLevel,
    activeFlags
  );
  return `${retention} Activity Feed retention`;
}

function getSamlText() {
  return 'SAML SSO';
}

interface Highlight {
  text: string;
  badgeLabel?: string;
}

type PlanHighlights = {
  [key in ApiServiceLevelEnum]: Highlight[];
};
