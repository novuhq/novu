import type { DiscoverWorkflowOutput } from '../../types';
import { EMOJI, log } from '../../utils';

export function prettyPrintDiscovery(discoveredWorkflow: DiscoverWorkflowOutput): void {
  // eslint-disable-next-line no-console
  console.log(`\n${log.bold(log.underline('Discovered workflowId:'))} '${discoveredWorkflow.workflowId}'`);
  discoveredWorkflow.steps.forEach((step, i) => {
    const isLastStep = i === discoveredWorkflow.steps.length - 1;
    const prefix = isLastStep ? '└' : '├';
    // eslint-disable-next-line no-console
    console.log(`${prefix} ${EMOJI.STEP} Discovered stepId: '${step.stepId}'\tType: '${step.type}'`);
    step.providers.forEach((provider, providerIndex) => {
      const isLastProvider = providerIndex === step.providers.length - 1;
      const stepPrefix = isLastStep ? ' ' : '│';
      const providerPrefix = isLastProvider ? '└' : '├';
      // eslint-disable-next-line no-console
      console.log(`${stepPrefix} ${providerPrefix} ${EMOJI.PROVIDER} Discovered provider: '${provider.type}'`);
    });
  });
}
