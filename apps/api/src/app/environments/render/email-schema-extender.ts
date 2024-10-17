/* eslint-disable */
import { TipTapNodeSchemaDto } from '@novu/shared-internal';

export function expendSchema(schema: TipTapNodeSchemaDto): TipTapNodeSchemaDto {
  const content = schema.content!.map(processNodeRecursive).filter((x) => Boolean(x)) as TipTapNodeSchemaDto[];
  return { ...schema, content };
}

function processItemNode(node: TipTapNodeSchemaDto, item: any): TipTapNodeSchemaDto {
  if (node.type === 'text' && typeof node.text === 'string') {
    const regex = /{#item\.(\w+)#}/g; // Updated regex to match {#item.X#}
    node.text = node.text.replace(regex, (_, key: string) => {
      const propertyName = key; // Directly use the captured group as the property name
      const replacement = item[propertyName] !== undefined ? item[propertyName] : _; // Check if the property exists
      return replacement;
    });
  }

  if (node.content) {
    node.content = node.content.map((innerNode) => processItemNode(innerNode, item));
  }

  return node;
}

const processNodeRecursive = (node: TipTapNodeSchemaDto): TipTapNodeSchemaDto | null => {
  if (node.type === 'show') {
    const whenValue = node.attr?.when;
    if (whenValue !== 'true') {
      return null;
    }
  }

  if (hasEachAttr(node)) {
    return { type: 'section', content: handleFor(node) };
  }

  return processNodeContent(node);
};

const processNodeContent = (node: TipTapNodeSchemaDto): TipTapNodeSchemaDto | null => {
  if (node.content) {
    node.content = node.content.map(processNodeRecursive).filter(Boolean) as TipTapNodeSchemaDto[];
  }
  return node;
};

function hasEachAttr(node: TipTapNodeSchemaDto): node is TipTapNodeSchemaDto & { attr: { each: any } } {
  return node.attr !== undefined && node.attr.each !== undefined;
}

function handleFor(node: TipTapNodeSchemaDto & { attr: { each: any } }): TipTapNodeSchemaDto[] {
  const items = node.attr.each;
  const newContent: TipTapNodeSchemaDto[] = [];

  const itemsParsed = JSON.parse(items.replace(/'/g, '"'));
  for (const item of itemsParsed) {
    const newNode = { ...node };

    // Process inner nodes with the current item
    newNode.content = newNode.content?.map((innerNode) => processItemNode(innerNode, item)) || [];

    // Add the processed content to the newContent array
    if (newNode.content) {
      newContent.push(...newNode.content);
    }
  }

  // Return the new content directly, replacing the original "for" node
  return newContent;
}
