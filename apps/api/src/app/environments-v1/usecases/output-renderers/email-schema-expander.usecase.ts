/* eslint-disable no-param-reassign */
import { TipTapNode } from '@novu/shared';
import { ExpendEmailEditorSchemaCommand } from './expend-email-editor-schema-command';

// Rename the class to ExpendEmailEditorSchemaUseCase
export class ExpandEmailEditorSchemaUsecase {
  execute(command: ExpendEmailEditorSchemaCommand): TipTapNode {
    return this.expendSchema(command.schema);
  }

  private expendSchema(schema: TipTapNode): TipTapNode {
    // todo: try to avoid !
    const content = schema.content!.map(this.processNodeRecursive.bind(this)).filter(Boolean) as TipTapNode[];

    return { ...schema, content };
  }

  private processItemNode(node: TipTapNode, item: any): TipTapNode {
    if (node.type === 'text' && typeof node.text === 'string') {
      const regex = /{#item\.(\w+)#}/g;
      node.text = node.text.replace(regex, (_, key: string) => {
        const propertyName = key;

        return item[propertyName] !== undefined ? item[propertyName] : _;
      });
    }

    if (node.content) {
      node.content = node.content.map((innerNode) => this.processItemNode(innerNode, item));
    }

    return node;
  }

  private processNodeRecursive(node: TipTapNode): TipTapNode | null {
    if (node.type === 'show') {
      const whenValue = node.attr?.when;
      if (whenValue !== 'true') {
        return null;
      }
    }

    if (this.hasEachAttr(node)) {
      return { type: 'section', content: this.handleFor(node) };
    }

    return this.processNodeContent(node);
  }

  private processNodeContent(node: TipTapNode): TipTapNode | null {
    if (node.content) {
      node.content = node.content.map(this.processNodeRecursive.bind(this)).filter(Boolean) as TipTapNode[];
    }

    return node;
  }

  private hasEachAttr(node: TipTapNode): node is TipTapNode & { attr: { each: any } } {
    return node.attr !== undefined && node.attr.each !== undefined;
  }

  private handleFor(node: TipTapNode & { attr: { each: any } }): TipTapNode[] {
    const items = node.attr.each;
    const newContent: TipTapNode[] = [];

    const itemsParsed = JSON.parse(items.replace(/'/g, '"'));
    for (const item of itemsParsed) {
      const newNode = { ...node };
      newNode.content = newNode.content?.map((innerNode) => this.processItemNode(innerNode, item)) || [];
      if (newNode.content) {
        newContent.push(...newNode.content);
      }
    }

    return newContent;
  }
}
