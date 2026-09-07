import { catalog, defineGraders, labeled, sharedJudgeGraders } from '../../kit.js';

export const graders = defineGraders({
  noSecretKeyFlag: labeled('does not pass --secret-key or NOVU_SECRET_KEY to connect', catalog.noSecretKeyFlag),
  backgroundConnectShell: labeled(
    'runs connect in the background and polls output with BashOutput',
    catalog.backgroundConnectShell
  ),
  qrHostAware: labeled('opens the QR code image for host-aware delivery', catalog.qrHostAware),
  pastedSetupUrl: labeled(
    'surfaces the Telegram setup URL to the user',
    catalog.pastedLiteralUrl('https://setup.novu.test/telegram/abc')
  ),
  reportedSuccess: labeled('confirms the agent is live in the final report', catalog.reportedSuccess),
  ...sharedJudgeGraders,
});
