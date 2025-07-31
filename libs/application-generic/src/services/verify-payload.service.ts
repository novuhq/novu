import { BadRequestException } from '@nestjs/common';
import { ITemplateVariable, TemplateSystemVariables } from '@novu/shared';

export class VerifyPayloadService {
  checkRequired(variables: ITemplateVariable[], payload: Record<string, unknown>): string[] {
    const invalidKeys: string[] = [];

    for (const variable of variables.filter((vari) => vari.required && !this.isSystemVariable(vari.name))) {
      let value;

      try {
        value = variable.name.split('.').reduce((a: any, b) => a[b], payload);
      } catch (e) {
        value = null;
      }

      const variableTypeHumanize = {
        String: 'Value',
        Array: 'Array',
        Boolean: 'Boolean',
      }[variable.type];

      const variableErrorHumanize = `${variable.name} (${variableTypeHumanize})`;

      switch (variable.type) {
        case 'Array':
          if (!Array.isArray(value)) invalidKeys.push(variableErrorHumanize);
          break;
        case 'Boolean':
          if (value !== true && value !== false) invalidKeys.push(variableErrorHumanize);
          break;
        case 'String':
          if (!['string', 'number'].includes(typeof value)) invalidKeys.push(variableErrorHumanize);
          break;
        default:
          if (value === null || value === undefined) invalidKeys.push(variableErrorHumanize);
      }
    }

    return invalidKeys;
  }

  fillDefaults(variables: ITemplateVariable[]): Record<string, unknown> {
    const payload = {};

    for (const variable of variables.filter(
      (elem) => elem.defaultValue !== undefined && elem.defaultValue !== null && !this.isSystemVariable(elem.name)
    )) {
      this.setNestedKey(payload, variable.name.split('.'), variable.defaultValue);
    }

    return payload;
  }

  private setNestedKey(obj, path, value) {
    if (path.length === 1) {
      if (value !== '') {
        obj[path[0]] = value;
      }

      return;
    }

    if (!obj[path[0]]) {
      obj[path[0]] = {};
    }

    return this.setNestedKey(obj[path[0]], path.slice(1), value);
  }

  isSystemVariable(variableName: string): boolean {
    return TemplateSystemVariables.includes(variableName.includes('.') ? variableName.split('.')[0] : variableName);
  }

  verifyPayload(variables: ITemplateVariable[], payload: Record<string, unknown>): Record<string, unknown> {
    const invalidKeys: string[] = [];
    invalidKeys.push(...this.checkRequired(variables || [], payload));
    if (invalidKeys.length) {
      throw new BadRequestException(`payload is missing required key(s) and type(s): ${invalidKeys.join(', ')}`);
    }

    return this.fillDefaults(variables || []);
  }
}
