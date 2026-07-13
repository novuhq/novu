import { catalog, defineGraders, labeled } from '../../kit.js';

export const graders = defineGraders({
  noConnectCommands: labeled('does not run a connect command', catalog.noConnectCommands),
  noConnectOnKeylessWhatsapp: labeled(
    'redirects the user to the dashboard instead of running connect',
    catalog.noConnectOnKeylessWhatsapp
  ),
});
