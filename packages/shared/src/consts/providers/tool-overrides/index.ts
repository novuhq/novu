import { ToolProviderIdEnum } from '../../../types';
import { opsgenieOverrideJsonSchema } from './opsgenie-override.schema';
import { pagerdutyOverrideJsonSchema } from './pagerduty-override.schema';
import type { ToolContentOverrideProviderId } from './tool-provider-primary-content';

export {
  type AnnotatedPreviewLine,
  buildAnnotatedPreviewLines,
  type MergedToolPreview,
  mergeToolProviderPreview,
} from './merge-tool-provider-preview';
export { opsgenieOverrideJsonSchema } from './opsgenie-override.schema';
export { pagerdutyOverrideJsonSchema } from './pagerduty-override.schema';
export {
  getToolProviderPrimaryContentKey,
  TOOL_CONTENT_OVERRIDE_PROVIDER_IDS,
  TOOL_PROVIDER_PRIMARY_CONTENT_KEY,
  type ToolContentOverrideProviderId,
} from './tool-provider-primary-content';

export const TOOL_PROVIDER_OVERRIDE_SCHEMAS = {
  [ToolProviderIdEnum.PagerDuty]: pagerdutyOverrideJsonSchema,
  [ToolProviderIdEnum.Opsgenie]: opsgenieOverrideJsonSchema,
} as const;

export function getToolProviderOverrideSchema(providerId: string) {
  if (providerId in TOOL_PROVIDER_OVERRIDE_SCHEMAS) {
    return TOOL_PROVIDER_OVERRIDE_SCHEMAS[providerId as ToolContentOverrideProviderId];
  }

  return undefined;
}
