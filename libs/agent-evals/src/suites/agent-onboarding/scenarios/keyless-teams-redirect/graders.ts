import { catalog, defineGraders, labeled } from '../../kit.js';

export const graders = defineGraders({
  noConnectCommands: labeled('does not run a connect command', catalog.noConnectCommands),
  noConnectOnKeylessTeams: labeled(
    'redirects the user to the dashboard instead of running connect',
    catalog.noConnectOnKeylessTeams
  ),
});
