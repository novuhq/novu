import { ITemplateVariable } from '@novu/dal';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { VerifyPayloadCommand } from './verify-payload.command';

export class VerifyPayload {
  execute(command: VerifyPayloadCommand): Record<string, unknown> {
    const missingKeys = [];
    const defaultPayload = {};

    for (const step of command.template.steps) {
      missingKeys.push(...this.checkRequired(step.template.variables || [], command.payload));
    }

    if (missingKeys.length) throw new ApiException(`payload is missing required key(s): ${missingKeys.join(', ')}`);

    for (const step of command.template.steps) {
      this.fillDefaults(step.template.variables || [], defaultPayload);
    }

    return defaultPayload;
  }

  private checkRequired(variables: ITemplateVariable[], payload: Record<string, unknown>): string[] {
    const missingKeys = [];

    for (const variable of variables.filter((vari) => vari.required)) {
      let value;

      try {
        value = variable.name.split('.').reduce((a, b) => a[b], payload);
      } catch (e) {
        value = null;
      }

      if (value === null || value === undefined) {
        missingKeys.push(variable.name);
      }
    }

    return missingKeys;
  }

  private fillDefaults(variables: ITemplateVariable[], payload: Record<string, unknown>) {
    for (const variable of variables.filter((vari) => vari.defaultValue !== undefined && vari.defaultValue !== null)) {
      this.setNestedKey(payload, variable.name.split('.'), variable.defaultValue);
    }
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
}
