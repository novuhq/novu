import { Badge } from '@/components/primitives/badge';
import { Card } from '@/components/primitives/card';
import { Check } from 'lucide-react';
import { ContactSalesButton } from './contact-sales-button';
import { PlanActionButton } from './plan-action-button';

interface PlansRowProps {
  selectedBillingInterval: 'month' | 'year';
  currentPlan?: 'free' | 'business' | 'enterprise';
  trial?: {
    isActive: boolean;
  };
}

interface PlanDisplayProps {
  price: string;
  subtitle: string;
  events: string;
}

function PlanDisplay({ price, subtitle, events }: PlanDisplayProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold tracking-tight">{price}</span>
        <span className="text-muted-foreground text-sm font-medium">{subtitle}</span>
      </div>
      <span className="text-muted-foreground text-sm">{events}</span>
    </div>
  );
}

export function PlansRow({ selectedBillingInterval, currentPlan, trial }: PlansRowProps) {
  const businessPlanPrice = selectedBillingInterval === 'year' ? '$2,700' : '$250';
  const effectiveCurrentPlan = trial?.isActive ? 'free' : currentPlan;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {/* Free Plan */}
      <Card
        className={`hover:border-primary/50 relative overflow-hidden border transition-colors ${currentPlan === 'free' && !trial?.isActive ? 'border-primary border-2 shadow-md' : ''}`}
      >
        <div className="flex h-full flex-col p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Free</h3>
              {effectiveCurrentPlan === 'free' && (
                <Badge variant="light" color="gray" size="sm">
                  Current Plan
                </Badge>
              )}
            </div>
            <PlanDisplay price="$0" subtitle="free forever" events="30,000 events per month" />
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <Check className="text-primary h-4 w-4" />
                <span>All core features</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="text-primary h-4 w-4" />
                <span>Up to 3 team members</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="text-primary h-4 w-4" />
                <span>Community support</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Business Plan */}
      <Card
        className={`relative overflow-hidden border transition-colors ${currentPlan === 'business' && !trial?.isActive ? 'border-primary border-2 shadow-md' : 'hover:border-primary/50'}`}
      >
        <div className="flex h-full flex-col p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Business</h3>
              {effectiveCurrentPlan === 'business' && (
                <Badge variant="light" color="gray" size="sm">
                  Current Plan
                </Badge>
              )}
            </div>
            <PlanDisplay
              price={businessPlanPrice}
              subtitle={`billed ${selectedBillingInterval === 'year' ? 'annually' : 'monthly'}`}
              events="250,000 events per month"
            />
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <Check className="text-primary h-4 w-4" />
                <span>Everything in Free</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="text-primary h-4 w-4" />
                <span>Unlimited team members</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="text-primary h-4 w-4" />
                <span>Priority support</span>
              </li>
            </ul>
          </div>
          <div className="mt-6">
            {effectiveCurrentPlan !== 'enterprise' && (
              <PlanActionButton selectedBillingInterval={selectedBillingInterval} mode="filled" className="w-full" />
            )}
          </div>
        </div>
      </Card>

      {/* Enterprise Plan */}
      <Card
        className={`relative overflow-hidden border transition-colors ${currentPlan === 'enterprise' && !trial?.isActive ? 'border-primary border-2 shadow-md' : 'hover:border-primary/50'}`}
      >
        <div className="flex h-full flex-col p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Enterprise</h3>
              {effectiveCurrentPlan === 'enterprise' && (
                <Badge variant="light" color="gray" size="sm">
                  Current Plan
                </Badge>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-semibold">Custom pricing</span>
              </div>
              <span className="text-muted-foreground text-sm">For large-scale operations</span>
            </div>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm">
                <Check className="text-primary h-4 w-4" />
                <span>Everything in Business</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="text-primary h-4 w-4" />
                <span>Unlimited team members</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Check className="text-primary h-4 w-4" />
                <span>Custom contracts & SLA</span>
              </li>
            </ul>
          </div>
          <div className="mt-auto">
            {effectiveCurrentPlan === 'enterprise' ? (
              <PlanActionButton selectedBillingInterval={selectedBillingInterval} mode="outline" className="w-full" />
            ) : (
              <ContactSalesButton variant="outline" className="w-full" />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
