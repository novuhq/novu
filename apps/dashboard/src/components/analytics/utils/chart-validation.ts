type DateBasedChartData = {
  timestamp: string;
};

export function hasMinimumDateRange<T extends DateBasedChartData>(data: T[], minimumDays: number = 5): boolean {
  if (!data || data.length === 0) {
    return false;
  }

  const uniqueDates = new Set(
    data.map((item) => {
      const date = new Date(item.timestamp);
      return date.toISOString().split('T')[0];
    })
  );

  return uniqueDates.size >= minimumDays;
}

export function hasMinimumDaysWithData<T extends DateBasedChartData>(
  data: T[],
  hasDataForItem: (item: T) => boolean,
  minimumDays: number = 5
): boolean {
  if (!data || data.length === 0) {
    return false;
  }

  // Group data by date and check if each date has meaningful data
  const dateGroups = new Map<string, T[]>();

  for (const item of data) {
    const date = new Date(item.timestamp).toISOString().split('T')[0];
    if (!dateGroups.has(date)) {
      dateGroups.set(date, []);
    }
    const dayData = dateGroups.get(date);
    if (dayData) {
      dayData.push(item);
    }
  }

  // Count days that have at least one data point with meaningful values
  let daysWithData = 0;
  for (const [, dayData] of dateGroups) {
    if (dayData.some(hasDataForItem)) {
      daysWithData++;
    }
  }

  return daysWithData >= minimumDays;
}

export function createDateBasedHasDataChecker<T extends DateBasedChartData>(
  hasDataForItem: (item: T) => boolean,
  minimumDays: number = 5
) {
  return (data: T[]) => {
    return hasMinimumDaysWithData(data, hasDataForItem, minimumDays);
  };
}

export function hasMinimumEntries<T>(
  data: T[],
  hasDataForItem: (item: T) => boolean,
  minimumEntries: number = 2
): boolean {
  if (!data || data.length === 0) {
    return false;
  }

  const entriesWithData = data.filter(hasDataForItem);

  return entriesWithData.length >= minimumEntries;
}

export function createVolumeBasedHasDataChecker<T>(hasDataForItem: (item: T) => boolean, minimumEntries: number = 2) {
  return (data: T[]) => {
    return hasMinimumEntries(data, hasDataForItem, minimumEntries);
  };
}
