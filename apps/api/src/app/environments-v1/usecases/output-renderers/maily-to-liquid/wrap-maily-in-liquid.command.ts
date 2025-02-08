import { BaseCommand } from '@novu/application-generic';
import { ValidateBy, ValidationOptions } from 'class-validator';
import { JSONContent as MailyJSONContent } from '@maily-to/render';
import { z } from 'zod';

export const MailyJSONContentSchema = z.custom<MailyJSONContent>();

export function isStringifiedMailyJSONContent(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  try {
    const parsed = JSON.parse(value);

    return isObjectMailyJSONContent(parsed);
  } catch {
    return false;
  }
}

export function isObjectMailyJSONContent(value: unknown): value is MailyJSONContent {
  if (!value || typeof value !== 'object') return false;

  const doc = value as MailyJSONContent;
  if (doc.type !== 'doc' || !Array.isArray(doc.content)) return false;

  return true;
}

function IsStringifiedMailyJSONContent(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isStringifiedMailyJSONContent',
      validator: {
        validate: (value): boolean => isStringifiedMailyJSONContent(value),
        defaultMessage: () => 'Input must be a valid stringified Maily JSON content',
      },
    },
    validationOptions
  );
}

export class WrapMailyInLiquidCommand extends BaseCommand {
  @IsStringifiedMailyJSONContent()
  emailEditor: string;
}
