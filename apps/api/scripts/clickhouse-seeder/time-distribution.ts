export interface TimeDistributionConfig {
  businessHoursWeight: number;
  weekendReduction: number;
  enablePeakPatterns: boolean;
}

export const DEFAULT_TIME_CONFIG: TimeDistributionConfig = {
  businessHoursWeight: 2.5,
  weekendReduction: 0.3,
  enablePeakPatterns: true,
};

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function isBusinessHours(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 9 && hour < 18;
}

export function getHourWeight(hour: number): number {
  if (hour >= 9 && hour < 18) {
    return 2.5;
  }

  if ((hour >= 7 && hour < 9) || (hour >= 18 && hour < 21)) {
    return 1.2;
  }

  if (hour >= 21 || hour < 7) {
    return 0.3;
  }

  return 1.0;
}

export function getDayWeight(date: Date, config: TimeDistributionConfig = DEFAULT_TIME_CONFIG): number {
  let weight = 1.0;

  if (isWeekend(date)) {
    weight *= config.weekendReduction;
  }

  return weight;
}

export function getTimestampWeight(date: Date, config: TimeDistributionConfig = DEFAULT_TIME_CONFIG): number {
  let weight = 1.0;

  weight *= getDayWeight(date, config);

  const hourWeight = getHourWeight(date.getHours());
  weight *= hourWeight;

  if (config.enablePeakPatterns) {
    const peakModifier = getPeakPatternModifier(date);
    weight *= peakModifier;
  }

  return weight;
}

function getPeakPatternModifier(date: Date): number {
  const hour = date.getHours();
  const dayOfWeek = date.getDay();
  const dayOfMonth = date.getDate();

  if (dayOfWeek === 2 && hour === 10) {
    return 1.8;
  }

  if (dayOfWeek === 4 && hour === 14) {
    return 1.5;
  }

  if (dayOfMonth === 1 && hour >= 8 && hour < 12) {
    return 2.0;
  }

  if (dayOfMonth === 15 && hour >= 9 && hour < 11) {
    return 1.7;
  }

  return 1.0;
}

export function generateRandomTimestampsForDay(
  date: Date,
  count: number,
  config: TimeDistributionConfig = DEFAULT_TIME_CONFIG
): Date[] {
  const timestamps: Date[] = [];
  const dayWeight = getDayWeight(date, config);
  const adjustedCount = Math.floor(count * dayWeight);

  const hourDistribution = calculateHourDistribution(adjustedCount, config);

  for (let hour = 0; hour < 24; hour++) {
    const countForHour = hourDistribution[hour];

    for (let i = 0; i < countForHour; i++) {
      const minute = Math.floor(Math.random() * 60);
      const second = Math.floor(Math.random() * 60);
      const millisecond = Math.floor(Math.random() * 1000);

      const timestamp = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hour,
        minute,
        second,
        millisecond
      );

      timestamps.push(timestamp);
    }
  }

  timestamps.sort((a, b) => a.getTime() - b.getTime());

  return timestamps;
}

function calculateHourDistribution(totalCount: number, config: TimeDistributionConfig): number[] {
  const hourWeights: number[] = [];
  let totalWeight = 0;

  for (let hour = 0; hour < 24; hour++) {
    const weight = getHourWeight(hour);
    hourWeights.push(weight);
    totalWeight += weight;
  }

  const distribution: number[] = [];
  let assignedCount = 0;

  for (let hour = 0; hour < 24; hour++) {
    const proportion = hourWeights[hour] / totalWeight;
    let count = Math.floor(totalCount * proportion);

    if (hour === 23) {
      count = totalCount - assignedCount;
    }

    distribution.push(count);
    assignedCount += count;
  }

  return distribution;
}

export function addRandomJitter(baseDate: Date, maxJitterMs: number = 5000): Date {
  const jitter = Math.floor(Math.random() * maxJitterMs * 2) - maxJitterMs;
  return new Date(baseDate.getTime() + jitter);
}

export function generateWorkflowRunTimestamps(
  startDate: Date,
  days: number,
  runsPerDay: number,
  config: TimeDistributionConfig = DEFAULT_TIME_CONFIG
): Date[] {
  const allTimestamps: Date[] = [];

  for (let day = 0; day < days; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + day);

    const timestampsForDay = generateRandomTimestampsForDay(currentDate, runsPerDay, config);
    allTimestamps.push(...timestampsForDay);
  }

  return allTimestamps;
}
