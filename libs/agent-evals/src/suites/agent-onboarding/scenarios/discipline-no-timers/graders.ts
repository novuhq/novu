import { catalog, defineGraders, type RunResult } from '../../kit.js';

function polledAtLeast(result: RunResult, count: number): 'pass' | 'fail' {
  return result.polledShellIds.length >= count ? 'pass' : 'fail';
}

export const graders = defineGraders({
  noTimersNoWatchers: catalog.noTimersNoWatchers,
  backgroundConnectShell: catalog.backgroundConnectShell,
  polledMultipleTimes: (result) => polledAtLeast(result, 3),
  reportedSuccess: catalog.reportedSuccess,
});
