import type { DiscoverWorkflowOutput, Logger } from '../../types';
import { EMOJI, log } from '../../utils';

export function prettyPrintDiscovery(
  discoveredWorkflow: DiscoverWorkflowOutput,
  verbose: boolean = true,
  logger: Logger = console
): void {
  if (!verbose) return;

  logger.info(`\n${log.bold(log.underline('Discovered workflowId:'))} '${discoveredWorkflow.workflowId}'`);
  discoveredWorkflow.steps.forEach((step, i) => {
    const isLastStep = i === discoveredWorkflow.steps.length - 1;
    const prefix = isLastStep ? '└' : '├';
    logger.info(`${prefix} ${EMOJI.STEP} Discovered stepId: '${step.stepId}'\tType: '${step.type}'`);
    step.providers.forEach((provider, providerIndex) => {
      const isLastProvider = providerIndex === step.providers.length - 1;
      const stepPrefix = isLastStep ? ' ' : '│';
      const providerPrefix = isLastProvider ? '└' : '├';
      logger.info(`${stepPrefix} ${providerPrefix} ${EMOJI.PROVIDER} Discovered provider: '${provider.type}'`);
    });
  });
}
