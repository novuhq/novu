import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { useRegion } from '@/context/region';
import { REGIONS } from './region-config';
import { useShouldShowRegionSelector } from './use-should-show-region-selector';

const REGION_OPTIONS = REGIONS.map((region) => ({
  value: region.code,
  label: region.name,
  flag: region.flag,
}));

export function RegionSelector() {
  const { selectedRegion, setSelectedRegion } = useRegion();
  const shouldShow = useShouldShowRegionSelector();
  const isInOrgCreation = window.location.pathname.includes('/auth/organization-list');

  if (!shouldShow) {
    return null;
  }

  const triggerClassName = isInOrgCreation
    ? 'h-8 w-auto min-w-[120px] border border-neutral-200 bg-background text-sm shadow-sm focus:ring-2 focus:ring-ring/20'
    : 'h-[26px] w-auto min-w-[100px] border border-neutral-200/50 bg-background text-xs shadow-sm focus:ring-1 focus:ring-ring/20 px-2';

  return (
    <Select value={selectedRegion} onValueChange={setSelectedRegion}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder="Select Region" />
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
