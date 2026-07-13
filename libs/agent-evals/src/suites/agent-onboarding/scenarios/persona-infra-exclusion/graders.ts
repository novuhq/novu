import { catalog, defineGraders, labeled, sharedJudgeGraders } from '../../kit.js';

export const graders = defineGraders({
  descriptionExcludesInfraTokens: labeled(
    'excludes infrastructure tokens from the drafted agent description',
    catalog.descriptionExcludesInfraTokens(['postgres', 'resend', 'mongodb', 'github', 'sentry'])
  ),
  descriptionIncludesAudience: labeled(
    'includes audience-specific tokens in the drafted agent description',
    catalog.descriptionIncludesTokens(['staff', 'wine', 'bartender', 'sommelier', 'waitstaff', 'hospitality'])
  ),
  confirmedBeforeRun: labeled('confirms with the user before running connect', catalog.confirmedBeforeRun),
  ...sharedJudgeGraders,
});
