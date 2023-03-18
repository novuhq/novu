import { getActivityList } from '../../../api/activity';
import { getActivityGraphStats } from '../../../api/activity';
import { getChartData } from './';
import { dailyGraphStatsMock, generateMockData } from '../consts';

export function loadActivityList(page, filters) {
  return getActivityList(page, filters);
}
export async function loadActivityChartData(filters, isDark = false) {
  const response = await getActivityGraphStats(filters);
  const data = getChartData(response.data, isDark);

  return data;
}

export const mockChartData = getChartData(dailyGraphStatsMock, false);
