import { ActionType } from '@/components/billing/utils/action.button.constants.ts';
import { Badge } from '@/components/primitives/badge';
import { Card } from '@/components/primitives/card';
import { ApiServiceLevelEnum, StripeBillingIntervalEnum } from '@novu/shared';
import { Check } from 'lucide-react';
import { ContactSalesButton } from './contact-sales-button';
import { PlanActionButton } from './plan-action-button';

interface PlansRowProps {
  selectedBillingInterval: StripeBillingIntervalEnum;
  currentPlan?: ApiServiceLevelEnum;
  plans: Record<ApiServiceLevelEnum, PlanConfig>;
}

export interface PlanConfig {
  name: string;
  price: string;
  subtitle: string;
  events: string;
  features: string[];
  actionType?: ActionType;
}

const PlanFeature = ({ text }: { text: string }) => (
  <li className="flex items-center gap-2 text-sm">
    <Check className="text-primary h-4 w-4" />
    <span>{text}</span>
  </li>
);

const PlanDisplay = ({
  price,
  subtitle,
  events,
  isEnterprise = false,
}: {
  price: string;
  subtitle: string;
  events: string;
  isEnterprise: boolean;
}) => (
  <div className="space-y-1">
    <div className="flex items-baseline gap-1">
      <span className={`${isEnterprise ? 'text-2xl font-semibold' : 'text-3xl font-bold tracking-tight'}`}>
        {price}
      </span>
      {!isEnterprise && <span className="text-muted-foreground text-sm font-medium">{subtitle}</span>}
    </div>
    {isEnterprise ? (
      <span className="text-muted-foreground text-sm">For scale</span>
    ) : (
      <span className="text-muted-foreground text-sm">{events}</span>
    )}
  </div>
);

export function PlansRow({ selectedBillingInterval, currentPlan, plans }: PlansRowProps) {
  const numberOfPlans = Object.keys(plans).length;

  return (
    <div className={`grid grid-cols-${numberOfPlans} gap-6 md:grid-cols-${numberOfPlans}`}>
      {Object.entries(plans).map(([planKey, planConfig]) => {
        const isCurrentPlan = currentPlan === planKey;
        return (
          <Card
            key={planKey}
            className={`relative overflow-hidden border transition-colors ${
              isCurrentPlan ? 'border-primary border-2 shadow-md' : 'hover:border-primary/50'
            }`}
          >
            <div className="flex h-full flex-col p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{planConfig.name}</h3>
                  {currentPlan === planKey && (
                    <Badge variant="light" color="gray" size="sm">
                      Current Plan
                    </Badge>
                  )}
                </div>

                <PlanDisplay
                  price={planConfig.price}
                  subtitle={planKey === 'enterprise' ? '' : planConfig.subtitle}
                  isEnterprise={planKey === 'enterprise'}
                  events={planConfig.events}
                />
                <ul className="space-y-2">
                  {planConfig.features.map((feature, index) => (
                    <PlanFeature key={index} text={feature} />
                  ))}
                </ul>
              </div>

              <div className="mt-auto pt-6">
                {planConfig.actionType === ActionType.BUTTON ? (
                  <PlanActionButton
                    billingInterval={selectedBillingInterval}
                    requestedServiceLevel={planKey as ApiServiceLevelEnum}
                    activeServiceLevel={currentPlan}
                    mode="filled"
                    className="w-full"
                  />
                ) : planConfig.actionType === ActionType.CONTACT ? (
                  <ContactSalesButton variant="outline" className="w-full" />
                ) : null}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
