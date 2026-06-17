import { catalog, defineGraders, labeled, type RunResult } from '../../kit.js';

function polledAtLeast(result: RunResult, count: number): 'pass' | 'fail' {
  return result.polledShellIds.length >= count ? 'pass' : 'fail';
}

export const graders = defineGraders({
  noTimersNoWatchers: labeled('does not use timer/watcher commands or tail log files', catalog.noTimersNoWatchers),
  backgroundConnectShell: labeled(
    'runs connect in the background and polls output with BashOutput',
    catalog.backgroundConnectShell
  ),
  polledMultipleTimes: labeled('polls the background connect shell at least three times', (result) =>
    polledAtLeast(result, 3)
  ),
  reportedSuccess: labeled('confirms the agent is live in the final report', catalog.reportedSuccess),
});
