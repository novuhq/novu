import { BadRequestException } from '@nestjs/common';
import { ITemplateVariable, TemplateSystemVariables } from '@novu/shared';

const PROTOTYPE_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const TEMPLATE_VARIABLE_SEGMENT_REGEX = /^[a-zA-Z_][a-zA-Z0-9_-]*(?:\[\d+\])?$/;

function getSegmentBaseName(segment: string): string {
  const bracketIndex = segment.indexOf('[');

  return bracketIndex === -1 ? segment : segment.slice(0, bracketIndex);
}

function isSafeVariablePathSegment(segment: string): boolean {
  const baseName = getSegmentBaseName(segment);

  if (PROTOTYPE_POLLUTION_KEYS.has(baseName)) {
    return false;
  }

  return TEMPLATE_VARIABLE_SEGMENT_REGEX.test(segment);
}

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
    const payload = Object.create(null) as Record<string, unknown>;

    for (const variable of variables.filter(
      (elem) => elem.defaultValue !== undefined && elem.defaultValue !== null && !this.isSystemVariable(elem.name)
    )) {
      const pathSegments = variable.name.split('.');

      if (!pathSegments.every(isSafeVariablePathSegment)) {
        continue;
      }

      this.setNestedKey(payload, pathSegments, variable.defaultValue);
    }

    return payload;
  }

  private setNestedKey(obj: Record<string, unknown>, path: string[], value: string | boolean): void {
    if (path.length === 0 || !path.every(isSafeVariablePathSegment)) {
      return;
    }

    if (path.length === 1) {
      if (value !== '') {
        obj[path[0]] = value;
      }

      return;
    }

    const existing = obj[path[0]];

    if (existing !== undefined && existing !== null && typeof existing !== 'object') {
      return;
    }

    if (!existing) {
      obj[path[0]] = Object.create(null);
    }

    this.setNestedKey(obj[path[0]] as Record<string, unknown>, path.slice(1), value);
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
