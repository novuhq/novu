/* eslint-disable no-param-reassign */
import { Injectable } from '@nestjs/common';
import { Liquid } from 'liquidjs';
import { render as mailyRender, JSONContent as MailyJSONContent } from '@maily-to/render';
import { createLiquidEngine } from '@novu/framework/internal';
import { sanitizeHTML } from '@novu/application-generic';

import { MailyAttrsEnum } from '../../../shared/helpers/maily.types';
import {
  hasShow,
  isButtonNode,
  isImageNode,
  isLinkNode,
  isRepeatNode,
  isVariableNode,
  wrapMailyInLiquid,
} from '../../../shared/helpers/maily-utils';
import { GetOrganizationSettings } from '../../../organization/usecases/get-organization-settings/get-organization-settings.usecase';
import { GetOrganizationSettingsCommand } from '../../../organization/usecases/get-organization-settings/get-organization-settings.command';
import { HtmlRendererCommand } from './html-renderer.command';
import { NOVU_BRANDING_HTML } from '../output-renderers/novu-branding-html';

type MailyJSONMarks = NonNullable<MailyJSONContent['marks']>[number];

function isJsonString(str: string): boolean {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }

  return true;
}

@Injectable()
export class HtmlRendererUseCase {
  private readonly liquidEngine: Liquid;

  constructor(private getOrganizationSettings: GetOrganizationSettings) {
    this.liquidEngine = createLiquidEngine();
  }

  public async execute({
    content,
    organizationId,
    disableOutputSanitization,
    payload,
    noHtmlWrappingTags,
  }: HtmlRendererCommand): Promise<string> {
    let renderedHtml: string;

    if (typeof content === 'object' || (typeof content === 'string' && isJsonString(content))) {
      const liquifiedMaily = wrapMailyInLiquid(content);
      const transformedMaily = await this.transformMailyContent(liquifiedMaily, payload);
      const parsedMaily = await this.parseMailyContentByLiquid(transformedMaily, payload);
      const strippedMaily = this.removeTrailingEmptyLines(parsedMaily);
      renderedHtml = await mailyRender(strippedMaily, { noHtmlWrappingTags });
    } else {
      renderedHtml = await this.liquidEngine.parseAndRender(content, payload);
    }

    // Add Novu branding if 'removeNovuBranding' is false
    const htmlWithBranding = await this.appendNovuBranding(renderedHtml, organizationId);

    if (disableOutputSanitization) {
      return htmlWithBranding;
    }

    return sanitizeHTML(htmlWithBranding);
  }

  private async transformMailyContent(node: MailyJSONContent, variables: object, parent?: MailyJSONContent) {
    const queue: Array<{ node: MailyJSONContent; parent?: MailyJSONContent }> = [{ node, parent }];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (hasShow(current.node)) {
        const shouldShow = await this.handleShowNode(current.node, variables, current.parent);

        if (!shouldShow) {
          continue;
        }
      }

      if (isRepeatNode(current.node)) {
        await this.handleEachNode(current.node, variables, current.parent);
      }

      if (isVariableNode(current.node)) {
        this.processVariableNodeTypes(current.node);
      }

      if (current.node.content) {
        for (const childNode of current.node.content) {
          queue.push({ node: childNode, parent: current.node });
        }
      }
    }

    return node;
  }

  private async handleShowNode(
    node: MailyJSONContent & { attrs: { [MailyAttrsEnum.SHOW_IF_KEY]: string } },
    variables: object,
    parent?: MailyJSONContent
  ): Promise<boolean> {
    const shouldShow = await this.evaluateShowCondition(variables, node);
    if (!shouldShow && parent?.content) {
      parent.content = parent.content.filter((pNode) => pNode !== node);
    }

    // @ts-ignore
    delete node.attrs[MailyAttrsEnum.SHOW_IF_KEY];

    return shouldShow;
  }

  private async getIterableArray(iterablePath: string, variables: object): Promise<unknown[]> {
    const iterableArrayString = await this.liquidEngine.parseAndRender(iterablePath, variables);

    try {
      const parsedArray = JSON.parse(iterableArrayString.replace(/'/g, '"'));

      if (!Array.isArray(parsedArray)) {
        throw new Error(`Iterable "${iterablePath}" is not an array`);
      }

      return parsedArray;
    } catch (error) {
      throw new Error(
        `Failed to parse iterable value for "${iterablePath}": ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Add the index to the liquid expression if it doesn't already have an array index
   *
   * @example
   * text: '{{ payload.comments.author }}'
   * iterablePath: '{{ payload.comments }}'
   * index: 0
   * result: '{{ payload.comments[0].author }}'
   */
  private addIndexToLiquidExpression(text: string, iterablePath: string, index: number): string {
    const cleanPath = iterablePath.replace(/\{\{|\}\}/g, '').trim();
    const liquidMatch = text.match(/\{\{\s*(.*?)\s*\}\}/);

    if (!liquidMatch) return text;

    const [path, ...filters] = liquidMatch[1].split('|').map((part) => part.trim());
    if (path.includes('[')) return text;

    const newPath = path.replace(cleanPath, `${cleanPath}[${index}]`);

    return filters.length ? `{{ ${newPath} | ${filters.join(' | ')} }}` : `{{ ${newPath} }}`;
  }

  private processForEachNodes(
    nodes: MailyJSONContent[],
    iterablePath: string,
    index: number
  ): Array<MailyJSONContent | MailyJSONMarks> {
    return nodes.map((node) => {
      const processedNode = { ...node };

      if (isVariableNode(processedNode)) {
        this.processVariableNodeTypes(processedNode);
        if (processedNode.text) {
          processedNode.text = this.addIndexToLiquidExpression(processedNode.text, iterablePath, index);
        }

        return processedNode;
      }

      if (isButtonNode(processedNode)) {
        if (processedNode.attrs?.text) {
          processedNode.attrs.text = this.addIndexToLiquidExpression(processedNode.attrs.text, iterablePath, index);
        }

        if (processedNode.attrs?.url) {
          processedNode.attrs.url = this.addIndexToLiquidExpression(processedNode.attrs.url, iterablePath, index);
        }

        return processedNode;
      }

      if (isImageNode(processedNode)) {
        if (processedNode.attrs?.src) {
          processedNode.attrs.src = this.addIndexToLiquidExpression(processedNode.attrs.src, iterablePath, index);
        }

        if (processedNode.attrs?.externalLink) {
          processedNode.attrs.externalLink = this.addIndexToLiquidExpression(
            processedNode.attrs.externalLink,
            iterablePath,
            index
          );
        }

        return processedNode;
      }

      if (isLinkNode(processedNode)) {
        if (processedNode.attrs?.href) {
          processedNode.attrs.href = this.addIndexToLiquidExpression(processedNode.attrs.href, iterablePath, index);
        }

        return processedNode;
      }

      if (processedNode.content?.length) {
        processedNode.content = this.processForEachNodes(processedNode.content, iterablePath, index);
      }

      if (processedNode.marks?.length) {
        processedNode.marks = this.processForEachNodes(
          processedNode.marks,
          iterablePath,
          index
        ) as Array<MailyJSONMarks>;
      }

      return processedNode;
    });
  }

  /**
   * For 'each' node, multiply the content by the number of items in the iterable array
   * and add indexes to the placeholders. If iterations attribute is set, limits the number
   * of iterations to that value, otherwise renders all items.
   *
   * @example
   * node:
   * {
   *   type: 'each',
   *   attrs: {
   *     each: '{{ payload.comments }}',
   *     iterations: 2 // Optional - limits to first 2 items only
   *   },
   *   content: [
   *     { type: 'variable', text: '{{ payload.comments.author }}' }
   *   ]
   * }
   *
   * variables:
   * { payload: { comments: [{ author: 'John Doe' }, { author: 'Jane Doe' }] } }
   *
   * result:
   * [
   *   { type: 'text', text: '{{ payload.comments[0].author }}' },
   *   { type: 'text', text: '{{ payload.comments[1].author }}' }
   * ]
   *
   */
  private async multiplyForEachNode(
    node: MailyJSONContent & { attrs: { [MailyAttrsEnum.EACH_KEY]: string } },
    variables: object
  ): Promise<MailyJSONContent[]> {
    const iterablePath = node.attrs[MailyAttrsEnum.EACH_KEY];
    const iterations = node.attrs[MailyAttrsEnum.ITERATIONS_KEY];
    const forEachNodes = node.content || [];
    const iterableArray = await this.getIterableArray(iterablePath, variables);
    const limitedIterableArray = iterations ? iterableArray.slice(0, iterations) : iterableArray;

    return limitedIterableArray.flatMap((_, index) => this.processForEachNodes(forEachNodes, iterablePath, index));
  }

  private async handleEachNode(
    node: MailyJSONContent & { attrs: { [MailyAttrsEnum.EACH_KEY]: string } },
    variables: object,
    parent?: MailyJSONContent
  ): Promise<void> {
    const newContent = await this.multiplyForEachNode(node, variables);

    if (parent?.content) {
      const nodeIndex = parent.content.indexOf(node);
      parent.content = [...parent.content.slice(0, nodeIndex), ...newContent, ...parent.content.slice(nodeIndex + 1)];
    } else {
      node.content = newContent;
    }
  }

  private stringToBoolean(value: string): boolean {
    const normalized = value.toLowerCase().trim();
    if (normalized === 'false' || normalized === 'null' || normalized === 'undefined') return false;

    try {
      return Boolean(JSON.parse(normalized));
    } catch {
      return Boolean(normalized);
    }
  }

  private async evaluateShowCondition(
    variables: object,
    node: MailyJSONContent & { attrs: { [MailyAttrsEnum.SHOW_IF_KEY]: string } }
  ): Promise<boolean> {
    const { [MailyAttrsEnum.SHOW_IF_KEY]: showIfKey } = node.attrs;
    const parsedShowIfValue = await this.liquidEngine.parseAndRender(showIfKey, variables);

    return this.stringToBoolean(parsedShowIfValue);
  }

  private processVariableNodeTypes(node: MailyJSONContent) {
    node.type = 'text'; // set 'variable' to 'text' to for Liquid to recognize it
    node.text = node.attrs?.id || '';
  }

  private async parseMailyContentByLiquid(
    mailyContent: MailyJSONContent,
    variables: object
  ): Promise<MailyJSONContent> {
    const parsedString = await this.liquidEngine.parseAndRender(JSON.stringify(mailyContent), variables);

    return JSON.parse(parsedString);
  }

  private removeTrailingEmptyLines(node: MailyJSONContent): MailyJSONContent {
    if (!node.content || node.content.length === 0) return node;

    // Iterate from the end of the content and find the first non-empty node
    let lastIndex = node.content.length;
    // eslint-disable-next-line no-plusplus
    for (let i = node.content.length - 1; i >= 0; i--) {
      const childNode = node.content[i];

      const isEmptyParagraph =
        childNode.type === 'paragraph' && !childNode.text && (!childNode.content || childNode.content.length === 0);

      if (!isEmptyParagraph) {
        lastIndex = i + 1; // Include this node in the result
        break;
      }
    }

    // Slice the content to remove trailing empty nodes
    const filteredContent = node.content.slice(0, lastIndex);

    return { ...node, content: filteredContent };
  }

  private insertBrandingHtml(html: string): string {
    const matches = [...html.matchAll(/<\/body>/gi)];

    if (matches.length === 0) {
      if (html?.trim()) {
        return html + NOVU_BRANDING_HTML;
      } else {
        return html;
      }
    }

    const lastIndex = matches[matches.length - 1].index!;

    return html.slice(0, lastIndex) + NOVU_BRANDING_HTML + html.slice(lastIndex);
  }

  private async appendNovuBranding(html: string, organizationId: string): Promise<string> {
    try {
      const { removeNovuBranding } = await this.getOrganizationSettings.execute(
        GetOrganizationSettingsCommand.create({
          organizationId,
        })
      );

      if (removeNovuBranding) {
        return html;
      }

      return this.insertBrandingHtml(html);
    } catch (error) {
      console.log('error', error);

      // If there's any error fetching organization, return original HTML to avoid breaking emails
      return html;
    }
  }
}
