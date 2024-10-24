/* eslint-disable no-param-reassign */
import { EmailRenderOutput, TipTapNode } from '@novu/shared';
import { z } from 'zod';
import { Injectable } from '@nestjs/common';
import { RenderCommand } from './render-command';
import { ExpandEmailEditorSchemaUsecase, TipTapSchema } from './email-schema-expander.usecase';
import { MasterPayload } from '../construct-framework-workflow';

export class EmailOutputRendererCommand extends RenderCommand {
  masterPayload: MasterPayload;
}

@Injectable()
export class EmailOutputRendererUsecase {
  constructor(private expendEmailEditorSchemaUseCase: ExpandEmailEditorSchemaUsecase) {}

  async execute(renderCommand: EmailOutputRendererCommand): Promise<EmailRenderOutput> {
    const emailControlValues = EmailStepControlSchema.parse(renderCommand.controlValues);
    const hydratedBody = this.hydrateBody(emailControlValues.emailEditor, renderCommand.masterPayload);
    const expandedSchema = this.expendEmailEditorSchemaUseCase.execute({ schema: hydratedBody });
    console.log(`expandedSchema: ${JSON.stringify(expandedSchema, null, 2)}`);

    return { subject: emailControlValues.subject, body: 'html' };
  }

  private hydrateBody(emailEditor: string, masterPayload: MasterPayload): TipTapNode {
    const body: TipTapNode = TipTapSchema.parse(JSON.parse(emailEditor));
    if (body.content) {
      transformContent(body.content, masterPayload);
    }

    return body;
  }
}

function buildElement(itemPointerToDefaultRecord: Record<string, string>, suffix: string) {
  const mockPayload = {};
  Object.keys(itemPointerToDefaultRecord).forEach((key) => {
    mockPayload[key] = itemPointerToDefaultRecord[key] + suffix;
  });

  return mockPayload;
}

function buildMockPayload(itemPointerToDefaultRecord: Record<string, string>) {
  return [buildElement(itemPointerToDefaultRecord, '1'), buildElement(itemPointerToDefaultRecord, '2')];
}

function getResolvedValueForPlaceholder(
  masterPayload: MasterPayload,
  node,
  itemPointerToDefaultRecord: Record<string, string>
) {
  const resolvedValue = getValueByPath(masterPayload, node.attrs.each);

  return resolvedValue || buildMockPayload(itemPointerToDefaultRecord);
}

function getResolvedValueRegularPlaceholder(masterPayload: MasterPayload, node) {
  const resolvedValue = getValueByPath(masterPayload, node.attrs.id);
  const { fallback } = node.attrs;

  return resolvedValue || fallback || `{{${node.attrs.id}}}`;
}
function getResolvedValueShowPlaceholder(masterPayload: MasterPayload, node) {
  const resolvedValue = getValueByPath(masterPayload, node.attrs.show);
  const { fallback } = node.attrs;

  return resolvedValue || fallback || `true`;
}
function isPayloadValue(node: TipTapNode): node is { type: 'payloadValue'; attrs: { id: string; fallback?: string } } {
  return !!(node.type === 'payloadValue' && node.attrs && typeof node.attrs.id === 'string');
}

function collectAllItemPlaceholders(nodeExt: TipTapNode) {
  const payloadValues = {};

  function traverse(node: TipTapNode) {
    if (isPayloadValue(node)) {
      const { id } = node.attrs;
      payloadValues[node.attrs.id] = node.attrs.fallback || `{{item.${id}}}`;
    }

    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(traverse);
    }
  }

  traverse(nodeExt);

  return payloadValues;
}

function transformContent(content: TipTapNode[], masterPayload: MasterPayload) {
  content.forEach((node, index) => {
    if (node.type === 'variable') {
      content[index] = {
        type: 'text',
        text: getResolvedValueRegularPlaceholder(masterPayload, node),
      };
    }
    if (node.type === 'for') {
      const itemPointerToDefaultRecord = collectAllItemPlaceholders(node);
      content[index] = {
        type: 'for',
        attrs: { each: getResolvedValueForPlaceholder(masterPayload, node, itemPointerToDefaultRecord) },
      };
    } else if (node.attrs && node.attrs.show) {
      node.attrs.show = getResolvedValueShowPlaceholder(masterPayload, node);
    } else if (node.content) {
      transformContent(node.content, masterPayload);
    }
  });
}

function getValueByPath(obj: Record<string, any>, path: string): any {
  const keys = path.split('.');

  return keys.reduce((currentObj, key) => {
    if (currentObj && typeof currentObj === 'object' && key in currentObj) {
      return currentObj[key];
    }

    return undefined;
  }, obj);
}

export const EmailStepControlSchema = z
  .object({
    emailEditor: z.string(),
    subject: z.string(),
  })
  .strict();
