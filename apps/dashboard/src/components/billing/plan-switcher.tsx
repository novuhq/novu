import { Tabs, TabsList, TabsTrigger } from '@/components/primitives/tabs';
import { StripeBillingIntervalEnum } from '@novu/shared';

interface PlanSwitcherProps {
  selectedBillingInterval: 'month' | 'year';
  setSelectedBillingInterval: (value: StripeBillingIntervalEnum) => void;
}

export function PlanSwitcher({ selectedBillingInterval, setSelectedBillingInterval }: PlanSwitcherProps) {
  return (
    <div className="border-border/20 relative flex h-10 items-end justify-between self-stretch border-none">
      <h2 className="text-lg font-semibold">Compare Plans</h2>
      <div className="flex flex-1 justify-end">
        <Tabs
          value={selectedBillingInterval}
          onValueChange={(value) => setSelectedBillingInterval(value as StripeBillingIntervalEnum)}
        >
          <TabsList>
            <TabsTrigger value="month">Monthly</TabsTrigger>
            <TabsTrigger value="year">
              Annually <span className="text-primary ml-2">10% off</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
