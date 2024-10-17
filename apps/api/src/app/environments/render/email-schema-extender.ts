/* eslint-disable */
e2e;

export function expendSchema(schema: TiptapNode): TiptapNode {
  const content = schema.content!.map(processNodeRecursive).filter((x) => Boolean(x)) as TiptapNode[];

  return { ...schema, content };
}

function processItemNode(node: TiptapNode, item: any): TiptapNode {
  if (node.type === 'text' && typeof node.text === 'string') {
    const regex = /{{(novu\.item\.(\w+))}}/g;
    node.text = node.text.replace(regex, (_, key: string) => {
      const propertyName = key.split('.')[2];

      return item[propertyName] !== undefined ? item[propertyName] : _;
    });
  }

  if (node.content) {
    node.content = node.content.map((innerNode) => processItemNode(innerNode, item));
  }

  return node;
}

const processNodeRecursive = (node: TiptapNode): TiptapNode | null => {
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

const processNodeContent = (node: TiptapNode): TiptapNode | null => {
  if (node.content) {
    node.content = node.content.map(processNodeRecursive).filter(Boolean) as TiptapNode[];
  }
  return node;
};

function hasEachAttr(node: TiptapNode): node is TiptapNode & { attr: { each: any } } {
  return node.attr !== undefined && node.attr.each !== undefined;
}

function handleFor(node: TiptapNode & { attr: { each: any } }): TiptapNode[] {
  const items = node.attr.each;
  const newContent: TiptapNode[] = [];

  for (const item of items) {
    const newNode = { ...node };

    // Process inner nodes with the current item
    newNode.content =
      newNode.content?.map((innerNode) => {
        return processItemNode(innerNode, item);
      }) || [];

    // Add the processed content to the newContent array
    if (newNode.content) {
      newContent.push(...newNode.content);
    }
  }

  // Return the new content directly, replacing the original "for" node
  return newContent;
}
