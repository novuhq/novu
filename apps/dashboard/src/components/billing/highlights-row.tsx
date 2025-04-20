import { Badge } from '@/components/primitives/badge';
import { Card } from '@/components/primitives/card';
import { ApiServiceLevelEnum } from '@novu/shared';

export interface HighlightsRowParams {
  highlightsArray: Partial<PlanHighlights>;
}

export interface PlanHighLight {
  text: string;
  badgeLabel?: string;
}

export type PlanHighlights = {
  [key in ApiServiceLevelEnum]: PlanHighLight[];
};

function PlanHighlights({ highlights }: { highlights: PlanHighLight[] }) {
  return (
    <Card className="bg-muted/30 flex-1 border-none p-6">
      <ul className="text-muted-foreground list-inside space-y-3 text-sm">
        {highlights.map((item, index) => (
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

export function HighlightsRow({ highlightsArray }: HighlightsRowParams) {
  const numberOfPlans = Object.keys(highlightsArray).length;
  return (
    <div className={`grid grid-cols-${numberOfPlans} gap-6 md:grid-cols-${numberOfPlans}`}>
      {Object.entries(highlightsArray).map(([planName, highlights]) => (
        <PlanHighlights key={planName} highlights={highlights} />
      ))}
    </div>
  );
}
