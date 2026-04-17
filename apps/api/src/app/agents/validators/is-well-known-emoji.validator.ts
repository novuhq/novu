import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { esmImport } from '../utils/esm-import';

let cachedNames: Set<string> | null = null;

async function loadEmojiNames(): Promise<Set<string>> {
  if (cachedNames) return cachedNames;

  const { DEFAULT_EMOJI_MAP } = await esmImport('chat');
  cachedNames = new Set<string>(Object.keys(DEFAULT_EMOJI_MAP));

  return cachedNames;
}

@ValidatorConstraint({ async: true, name: 'isWellKnownEmoji' })
export class IsWellKnownEmojiConstraint implements ValidatorConstraintInterface {
  async validate(value: unknown): Promise<boolean> {
    if (typeof value !== 'string') return false;

    const names = await loadEmojiNames();

    return names.has(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${JSON.stringify(args.value)} is not a supported emoji name. Use GET /agents/emoji to list available options.`;
  }
}

export function IsWellKnownEmoji(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsWellKnownEmojiConstraint,
    });
  };
}
