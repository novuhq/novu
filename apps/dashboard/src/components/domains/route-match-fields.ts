import { ROUTE_MATCH_CONTEXT_PATHS } from '@novu/shared';
import type { EnhancedField } from '@/components/conditions-editor/conditions-editor';
import type { EnhancedLiquidVariable, LiquidVariable } from '@/utils/parseStepVariables';

const FIELD_LABELS: Record<string, string> = {
  'mail.fromAddress': 'From email',
  'mail.fromDomain': 'From domain',
  'mail.fromName': 'From name',
  'mail.toAddress': 'To email',
  'mail.toLocalPart': 'To local part',
  'mail.toDomain': 'To domain',
  'mail.subject': 'Subject',
  'mail.text': 'Text body',
  'mail.html': 'HTML body',
  'mail.hasAttachments': 'Has attachments',
  'mail.attachmentCount': 'Attachment count',
  'mail.attachmentTotalBytes': 'Attachment total bytes',
  'mail.inReplyTo': 'In reply to',
  'mail.headers.auto-submitted': 'Auto-submitted header',
  'mail.headers.authentication-results': 'Authentication-results header',
  'domain.name': 'Domain name',
  'route.address': 'Route address',
  'auth.spf': 'SPF result',
  'auth.dkim': 'DKIM result',
  'auth.dmarc': 'DMARC result',
  'auth.raw': 'Raw auth results',
};

const NUMBER_FIELDS = new Set(['mail.attachmentCount', 'mail.attachmentTotalBytes']);
const BOOLEAN_FIELDS = new Set(['mail.hasAttachments']);

function getDataType(path: string): EnhancedField['dataType'] {
  if (NUMBER_FIELDS.has(path)) return 'number';
  if (BOOLEAN_FIELDS.has(path)) return 'boolean';

  return 'string';
}

export const ROUTE_MATCH_FIELDS: EnhancedField[] = ROUTE_MATCH_CONTEXT_PATHS.map((path) => ({
  name: path,
  label: FIELD_LABELS[path] ?? path,
  value: path,
  dataType: getDataType(path),
}));

export const ROUTE_MATCH_VARIABLES: LiquidVariable[] = ROUTE_MATCH_FIELDS.map((field) => ({
  name: field.name,
  displayLabel: field.label,
}));

export const ROUTE_MATCH_ENHANCED_VARIABLES: EnhancedLiquidVariable[] = ROUTE_MATCH_FIELDS.map((field) => ({
  name: field.name,
  displayLabel: field.label,
  dataType: field.dataType,
  inputType: field.inputType,
  format: field.format,
}));

export function isAllowedRouteMatchVariable(variable: LiquidVariable): boolean {
  return ROUTE_MATCH_FIELDS.some((field) => field.name === variable.name);
}
