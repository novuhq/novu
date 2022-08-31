import { ITemplateVariable } from '@novu/dal';
import { TemplateSystemVariables } from '@novu/shared';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { VerifyPayloadCommand } from './verify-payload.command';

export class VerifyPayload {
  execute(command: VerifyPayloadCommand): Record<string, unknown> {
    const invalidKeys = [];
    let defaultPayload;

    for (const step of command.template.steps) {
      invalidKeys.push(...this.checkRequired(step.template.variables || [], command.payload));
    }

    if (invalidKeys.length)
      throw new ApiException(`payload is missing required key(s) and type(s): ${invalidKeys.join(', ')}`);

    for (const step of command.template.steps) {
      defaultPayload = this.fillDefaults(step.template.variables || []);
    }

    return defaultPayload;
  }

  private checkRequired(variables: ITemplateVariable[], payload: Record<string, unknown>): string[] {
    const invalidKeys = [];

    for (const variable of variables.filter((vari) => vari.required && !this.isSystemVariable(vari.name))) {
      let value;

      try {
        value = variable.name.split('.').reduce((a, b) => a[b], payload);
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

  private fillDefaults(variables: ITemplateVariable[]): Record<string, unknown> {
    const payload = {};

    for (const variable of variables.filter(
      (vari) => vari.defaultValue !== undefined && vari.defaultValue !== null && !this.isSystemVariable(vari.name)
    )) {
      this.setNestedKey(payload, variable.name.split('.'), variable.defaultValue);
    }

    return payload;
  }

  private setNestedKey(obj, path, value) {
    if (path.length === 1) {
      obj[path[0]] = value;

      return;
    }

    if (!obj[path[0]]) {
      obj[path[0]] = {};
    }

    return this.setNestedKey(obj[path[0]], path.slice(1), value);
  }

  private isSystemVariable(variableName: string): boolean {
    return TemplateSystemVariables.includes(variableName.includes('.') ? variableName.split('.')[0] : variableName);
  }
}
