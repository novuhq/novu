import { FeatureFlagsKeysEnum } from '@novu/shared';
import { Globe } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { IS_EU } from '@/config';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useRegion } from './region-context';
import { type Region } from './region-types';

const REGION_OPTIONS: Array<{ value: Region; label: string; flag: string }> = [
  { value: 'us', label: 'US', flag: '🇺🇸' },
  { value: 'singapore', label: 'Singapore', flag: '🇸🇬' },
];

export function RegionSelector() {
  const { selectedRegion, setSelectedRegion } = useRegion();
  const isRegionSelectorEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_REGION_SELECTOR_ENABLED, false);

  // Check if we're in organization creation flow
  const isInOrgCreation = window.location.pathname.includes('/auth/organization-list');

  // Hide region selector for EU users, but always show during org creation if feature is enabled
  if (IS_EU || (!isRegionSelectorEnabled && !isInOrgCreation)) {
    return null;
  }

  // Match header button proportions - slim and consistent with other header elements
  const triggerClassName = isInOrgCreation
    ? 'h-8 w-auto min-w-[120px] border border-neutral-200 bg-background text-sm shadow-sm focus:ring-2 focus:ring-ring/20'
    : 'h-[26px] w-auto min-w-[100px] border border-neutral-200/50 bg-background text-xs shadow-sm focus:ring-1 focus:ring-ring/20 px-2';

  return (
    <Select value={selectedRegion} onValueChange={setSelectedRegion}>
      <SelectTrigger className={triggerClassName}>
        <div className="flex items-center gap-1.5">
          <Globe size={12} className="text-muted-foreground" />
          <SelectValue placeholder="Select Region" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {REGION_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-2">
              <span className="text-sm">{option.flag}</span>
              <span className="text-xs font-medium">{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
