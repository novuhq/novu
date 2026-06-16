import { catalog, defineGraders, sharedJudgeGraders } from '../../kit.js';

export const graders = defineGraders({
  descriptionExcludesInfraTokens: catalog.descriptionExcludesInfraTokens([
    'postgres',
    'resend',
    'mongodb',
    'github',
    'sentry',
  ]),
  descriptionIncludesAudience: catalog.descriptionIncludesTokens(['staff', 'wine']),
  confirmedBeforeRun: catalog.confirmedBeforeRun,
  ...sharedJudgeGraders,
});
