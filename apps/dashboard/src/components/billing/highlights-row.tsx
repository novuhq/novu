import { Badge } from '@/components/primitives/badge';
import { Card } from '@/components/primitives/card';
import { ApiServiceLevelEnum } from '@novu/shared';

interface Highlight {
  text: string;
  badgeLabel?: string;
}

type PlanHighlights = {
  [key in ApiServiceLevelEnum]?: Highlight[];
};

const highlights: PlanHighlights = {
  [ApiServiceLevelEnum.FREE]: [
    { text: 'Up to 30,000 events per month' },
    { text: '3 teammates' },
    { text: '30 days Activity Feed retention' },
  ],
  [ApiServiceLevelEnum.BUSINESS]: [
    { text: 'Up to 250,000 events per month' },
    { text: 'Unlimited teammates' },
    { text: '90 days Activity Feed retention' },
  ],
  [ApiServiceLevelEnum.ENTERPRISE]: [
    { text: 'Up to 5,000,000 events per month' },
    { text: 'Unlimited teammates' },
    { text: 'SAML SSO' },
  ],
};

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
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {Object.entries(highlights).map(([planName, planHighlights]) => (
        <PlanHighlights key={planName} planHighlights={planHighlights} />
      ))}
    </div>
  );
}
