/* eslint-disable */
import { TipTapNodeSchemaDto } from '@novu/shared-internal';

export function expendSchema(schema: TipTapNodeSchemaDto): TipTapNodeSchemaDto {
  console.log('Initial schema:', JSON.stringify(schema, null, 2)); // Log the initial schema
  const content = schema.content!.map(processNodeRecursive).filter((x) => Boolean(x)) as TipTapNodeSchemaDto[];
  console.log('Processed content:', JSON.stringify(content, null, 2)); // Log processed content
  return { ...schema, content };
}

function processItemNode(node: TipTapNodeSchemaDto, item: any): TipTapNodeSchemaDto {
  console.log('Processing item node:', JSON.stringify(node, null, 2)); // Log the node being processed
  console.log('Current item:', JSON.stringify(item, null, 2)); // Log the current item

  if (node.type === 'text' && typeof node.text === 'string') {
    const regex = /{#item\.(\w+)#}/g; // Updated regex to match {#item.X#}
    node.text = node.text.replace(regex, (_, key: string) => {
      const propertyName = key; // Directly use the captured group as the property name
      const replacement = item[propertyName] !== undefined ? item[propertyName] : _; // Check if the property exists
      console.log(`Replacing {#item.${key}#} with ${replacement}`); // Log the replacement
      return replacement;
    });
  }

  if (node.content) {
    console.log('Node has content, processing inner nodes.'); // Log if node has content
    node.content = node.content.map((innerNode) => processItemNode(innerNode, item));
  }

  console.log('Processed item node:', JSON.stringify(node, null, 2)); // Log the processed node
  return node;
}

const processNodeRecursive = (node: TipTapNodeSchemaDto): TipTapNodeSchemaDto | null => {
  console.log('Processing node recursively:', JSON.stringify(node, null, 2)); // Log the node being processed

  if (node.type === 'show') {
    const whenValue = node.attr?.when;
    console.log(`Node type is 'show'. whenValue: ${whenValue}`); // Log the whenValue
    if (whenValue !== 'true') {
      console.log('Node does not meet the condition to show, returning null.'); // Log if node is not shown
      return null;
    }
  }

  if (hasEachAttr(node)) {
    console.log('Node has "each" attribute, handling for loop.'); // Log if node has each attr
    return { type: 'section', content: handleFor(node) };
  }

  return processNodeContent(node);
};

const processNodeContent = (node: TipTapNodeSchemaDto): TipTapNodeSchemaDto | null => {
  console.log('Processing node content:', JSON.stringify(node, null, 2)); // Log the node content being processed

  if (node.content) {
    console.log('Node has content, processing each inner node.'); // Log if node has content
    node.content = node.content.map(processNodeRecursive).filter(Boolean) as TipTapNodeSchemaDto[];
  }

  console.log('Processed node content:', JSON.stringify(node, null, 2)); // Log the processed content
  return node;
};

function hasEachAttr(node: TipTapNodeSchemaDto): node is TipTapNodeSchemaDto & { attr: { each: any } } {
  const hasAttr = node.attr !== undefined && node.attr.each !== undefined;
  console.log(`Node has "each" attribute: ${hasAttr}`); // Log if node has the each attribute
  return hasAttr;
}

function handleFor(node: TipTapNodeSchemaDto & { attr: { each: any } }): TipTapNodeSchemaDto[] {
  const items = node.attr.each;
  console.log('Items for handling "for":', items, typeof items); // Log the items for handling "for"
  const newContent: TipTapNodeSchemaDto[] = [];

  const itemsParsed = JSON.parse(items.replace(/'/g, '"'));
  for (const item of itemsParsed) {
    console.log('Current item in loop:', JSON.stringify(item, null, 2)); // Log current item in the loop
    const newNode = { ...node };

    // Process inner nodes with the current item
    newNode.content = newNode.content?.map((innerNode) => processItemNode(innerNode, item)) || [];

    // Add the processed content to the newContent array
    if (newNode.content) {
      console.log('Adding processed content to newContent:', JSON.stringify(newNode.content, null, 2)); // Log new content being added
      newContent.push(...newNode.content);
    }
  }

  // Return the new content directly, replacing the original "for" node
  console.log('Final new content for "for":', JSON.stringify(newContent, null, 2)); // Log final new content
  return newContent;
}
