import { catalog, defineGraders, judge, judgePrompts, labeled, sharedJudgeGraders, transcriptText } from '../../kit.js';
import { SENDBLUE_FROM_NUMBER, SENDBLUE_TEST_PHONE } from './scenario.js';

// Match the stable `sms:` deep-link prefix rather than the full query string, so a verbatim
// relay passes even if the agent renders the link inside markdown or trims the body param.
const IMESSAGE_DEEPLINK_PREFIX = 'sms:+14155550100';

export const graders = defineGraders({
  noSecretKeyFlag: labeled('does not pass --secret-key or NOVU_SECRET_KEY to connect', catalog.noSecretKeyFlag),
  backgroundConnectShell: labeled(
    'runs connect in the background and polls output with BashOutput',
    catalog.backgroundConnectShell
  ),
  sendblueFlagsPresent: labeled(
    'passes all four --sendblue-* flags on the connect command',
    catalog.sendblueFlagsPresent
  ),
  sendblueNumbersDistinct: labeled(
    'maps the Sendblue sender number and the user phone to the right flags',
    catalog.sendblueNumbersDistinct(SENDBLUE_FROM_NUMBER, SENDBLUE_TEST_PHONE)
  ),
  surfacedImessageDeepLink: labeled(
    'surfaces the iMessage deep link handoff to the user',
    catalog.pastedLiteralUrl(IMESSAGE_DEEPLINK_PREFIX)
  ),
  reportedSuccess: labeled('confirms the agent is live in the final report', catalog.reportedSuccess),
  sendblueSecretsWarning: labeled(
    'warns that the Sendblue secrets are provided in chat',
    judge(judgePrompts.sendblueSecretsWarning, (result) => transcriptText(result))
  ),
  ...sharedJudgeGraders,
});
