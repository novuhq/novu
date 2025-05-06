import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../primitives/select';
import { EuFlag } from '../icons/flags/eu';
import { USFlag } from '../icons/flags/us';
import { BsFillInfoCircleFill } from 'react-icons/bs';
import { Tooltip, TooltipTrigger } from '../primitives/tooltip';
import { TooltipProvider } from '../primitives/tooltip';
import { TooltipContent } from '../primitives/tooltip';

const REGION_MAP = {
  US: 'US',
  EU: 'EU',
} as const;

type RegionType = (typeof REGION_MAP)[keyof typeof REGION_MAP];

function getDefaultRegion(): RegionType {
  if (typeof window === 'undefined') return REGION_MAP.US;

  return window.location.hostname.includes('eu.') ? REGION_MAP.EU : REGION_MAP.US;
}

export function RegionPicker() {
  const [selectedRegion] = useState<RegionType>(getDefaultRegion());

  function handleRegionChange(value: RegionType) {
    switch (value) {
      case REGION_MAP.US:
        window.location.href = 'https://dashboard-v2.novu.co';
        break;
      case REGION_MAP.EU:
        window.location.href = 'https://eu.dashboard-v2.novu.co';
        break;
    }
  }

  return (
    <div className="inline-flex w-full items-center justify-center gap-1.5">
      <div className="text-xs font-medium leading-none text-neutral-400">
        Data Residency
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger className="ml-1">
              <BsFillInfoCircleFill className="text-foreground-300 -mt-0.5 inline size-3" />
            </TooltipTrigger>
            <TooltipContent>
              Novu offers data residency in Europe (Germany) and the United States. Data residency cannot be modified
              after sign-up.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div>
        <Select value={selectedRegion} onValueChange={handleRegionChange}>
          <SelectTrigger className="h-[22px] w-16 p-1 pl-1.5 text-[10px] leading-[14px]">
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            {Object.values(REGION_MAP).map((option) => (
              <SelectItem key={option} value={option} className="w-full">
                <div className="flex items-center gap-[6px]">
                  {option === REGION_MAP.US ? <USFlag className="h-3 w-3" /> : <EuFlag className="h-3 w-3" />} {option}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
