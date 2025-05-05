import { ApiServiceLevelEnum, FeatureNameEnum } from '@novu/shared';
import { cn } from '../../utils/ui';

export type PlanFeatureValue = {
  value: React.ReactNode;
};

export type Feature = {
  label: string;
  isTitle?: boolean;
  values: Partial<Record<ApiServiceLevelEnum, PlanFeatureValue>>;
};

export interface BuildValuesParams {
  featureName?: FeatureNameEnum;
  isBoolean?: boolean;
  prefix?: string | React.ReactNode;
  suffix?: string | React.ReactNode;
}

function FeatureRow({ feature, index }: { feature: Feature; index: number }) {
  return (
    <div
      className={cn('divide-border grid grid-cols-5 divide-x bg-neutral-50', {
        'bg-muted/50': index % 2 === 1,
        'border-border border-y': feature.isTitle,
      })}
    >
      <div className="p-4">
        <span
          className={cn('text-sm', {
            'text-foreground font-semibold': feature.isTitle,
            'text-muted-foreground': !feature.isTitle,
          })}
        >
          {feature.label}
        </span>
      </div>

      {Object.entries(feature.values).map(([plan, value]) => (
        <div key={plan} className="flex items-center justify-center p-4">
          <span className="text-muted-foreground text-sm">{value.value}</span>
        </div>
      ))}
    </div>
  );
}

export interface FeaturesProps {
  features: Feature[];
}

export function Features({ features }: FeaturesProps) {
  return (
    <div className="flex flex-col">
      {features.map((feature, index) => (
        <FeatureRow key={index} feature={feature} index={index} />
      ))}
    </div>
  );
}
