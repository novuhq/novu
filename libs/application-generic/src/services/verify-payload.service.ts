import { BadRequestException } from '@nestjs/common';
import { ITemplateVariable, TemplateSystemVariables } from '@novu/shared';

const PROTOTYPE_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const TEMPLATE_VARIABLE_SEGMENT_REGEX = /^[a-zA-Z_][a-zA-Z0-9_-]*(?:\[\d+\])?$/;

type PathPart = { kind: 'key'; value: string } | { kind: 'index'; value: number };

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

function parseVariablePath(variableName: string): PathPart[] | null {
  const segments = variableName.split('.');

  if (!segments.every(isSafeVariablePathSegment)) {
    return null;
  }

  const parts: PathPart[] = [];

  for (const segment of segments) {
    const bracketIndex = segment.indexOf('[');

    if (bracketIndex === -1) {
      parts.push({ kind: 'key', value: segment });
      continue;
    }

    const baseName = segment.slice(0, bracketIndex);
    const indexMatch = segment.slice(bracketIndex).match(/^\[(\d+)\]$/);

    if (!indexMatch) {
      return null;
    }

    parts.push({ kind: 'key', value: baseName });
    parts.push({ kind: 'index', value: Number(indexMatch[1]) });
  }

  return parts;
}

function getValueAtPath(payload: Record<string, unknown>, variableName: string): unknown {
  const pathParts = parseVariablePath(variableName);

  if (!pathParts) {
    return undefined;
  }

  let current: unknown = payload;

  for (const part of pathParts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (part.kind === 'key') {
      if (typeof current !== 'object' || Array.isArray(current)) {
        return undefined;
      }

      current = (current as Record<string, unknown>)[part.value];
      continue;
    }

    if (!Array.isArray(current)) {
      return undefined;
    }

    current = current[part.value];
  }

  return current;
}

export class VerifyPayloadService {
  checkRequired(variables: ITemplateVariable[], payload: Record<string, unknown>): string[] {
    const invalidKeys: string[] = [];

    for (const variable of variables.filter((vari) => vari.required && !this.isSystemVariable(vari.name))) {
      let value;

      try {
        value = getValueAtPath(payload, variable.name);
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
      const pathParts = parseVariablePath(variable.name);

      if (!pathParts) {
        continue;
      }

      this.setNestedValue(payload, pathParts, variable.defaultValue);
    }

    return payload;
  }

  private setNestedValue(target: unknown, parts: PathPart[], value: string | boolean): void {
    if (parts.length === 0) {
      return;
    }

    if (parts.length === 1) {
      const [part] = parts;

      if (value === '') {
        return;
      }

      if (part.kind === 'key') {
        (target as Record<string, unknown>)[part.value] = value;

        return;
      }

      const array = target as unknown[];

      while (array.length <= part.value) {
        array.push(undefined);
      }

      array[part.value] = value;

      return;
    }

    const [head, ...tail] = parts;
    const next = tail[0];

    if (head.kind === 'key') {
      const record = target as Record<string, unknown>;
      const existing = record[head.value];

      if (existing !== undefined && existing !== null && typeof existing !== 'object') {
        return;
      }

      if (!existing) {
        record[head.value] = next.kind === 'index' ? [] : Object.create(null);
      } else if (next.kind === 'index' && !Array.isArray(existing)) {
        return;
      } else if (next.kind === 'key' && (typeof existing !== 'object' || Array.isArray(existing))) {
        return;
      }

      this.setNestedValue(record[head.value], tail, value);

      return;
    }

    const array = target as unknown[];
    const existing = array[head.value];

    if (existing !== undefined && existing !== null && typeof existing !== 'object') {
      return;
    }

    while (array.length <= head.value) {
      array.push(undefined);
    }

    if (existing === undefined || existing === null) {
      array[head.value] = next.kind === 'index' ? [] : Object.create(null);
    } else if (next.kind === 'index' && !Array.isArray(existing)) {
      return;
    } else if (next.kind === 'key' && (typeof existing !== 'object' || Array.isArray(existing))) {
      return;
    }

    this.setNestedValue(array[head.value], tail, value);
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
