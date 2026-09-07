import type { Framework } from '../framework-guides.instructions';

export function updateFrameworkCode(
  framework: Framework,
  environmentIdentifier: string,
  subscriberId: string,
  primaryColor: string,
  foregroundColor: string
): Framework {
  return {
    ...framework,
    installSteps: framework.installSteps.map((step) => {
      if (!step.code) return step;

      return {
        ...step,
        code: step.code
          .replace(/YOUR_APP_ID/g, () => environmentIdentifier)
          .replace(/YOUR_APPLICATION_IDENTIFIER/g, () => environmentIdentifier)
          .replace(/YOUR_SUBSCRIBER_ID/g, () => subscriberId)
          .replace(/YOUR_PRIMARY_COLOR/g, () => primaryColor)
          .replace(/YOUR_FOREGROUND_COLOR/g, () => foregroundColor),
      };
    }),
  };
}
