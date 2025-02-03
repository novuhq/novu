/* eslint-disable no-param-reassign */
import { render as mailyRender, JSONContent as MailyJSONContent } from '@maily-to/render';
import { Injectable } from '@nestjs/common';
import { Liquid } from 'liquidjs';
import { EmailRenderOutput } from '@novu/shared';
import { InstrumentUsecase } from '@novu/application-generic';
import { FullPayloadForRender, RenderCommand } from './render-command';
import { WrapMailyInLiquidUseCase } from './maily-to-liquid/wrap-maily-in-liquid.usecase';
import { MAILY_ITERABLE_MARK, MailyAttrsEnum, MailyContentTypeEnum } from './maily-to-liquid/maily.types';
import { parseLiquid } from '../../../shared/helpers/liquid';

export class EmailOutputRendererCommand extends RenderCommand {}

@Injectable()
export class EmailOutputRendererUsecase {
  constructor(private wrapMailyInLiquidUsecase: WrapMailyInLiquidUseCase) {}

  @InstrumentUsecase()
  async execute(renderCommand: EmailOutputRendererCommand): Promise<EmailRenderOutput> {
    const { body, subject } = renderCommand.controlValues;

    if (!body || typeof body !== 'string') {
      /**
       * Force type mapping in case undefined control.
       * This passes responsibility to framework to throw type validation exceptions
       * rather than handling invalid types here.
       */
      return {
        subject: subject as string,
        body: body as string,
      };
    }

    const liquifiedMaily = this.wrapMailyInLiquidUsecase.execute({ emailEditor: body });
    const transformedMaily = await this.transformMailyContent(liquifiedMaily, renderCommand.fullPayloadForRender);
    const parsedMaily = await this.parseMailyContentByLiquid(transformedMaily, renderCommand.fullPayloadForRender);
    const strippedMaily = this.removeTrailingEmptyLines(parsedMaily);
    const renderedHtml = await mailyRender(strippedMaily);

    /**
     * Force type mapping in case undefined control.
     * This passes responsibility to framework to throw type validation exceptions
     * rather than handling invalid types here.
     */
    return { subject: subject as string, body: renderedHtml };
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

  private async parseMailyContentByLiquid(
    mailyContent: MailyJSONContent,
    variables: FullPayloadForRender
  ): Promise<MailyJSONContent> {
    const parsedString = await parseLiquid(JSON.stringify(mailyContent), variables);

    return JSON.parse(parsedString);
  }

  private async transformMailyContent(
    node: MailyJSONContent,
    variables: FullPayloadForRender,
    parent?: MailyJSONContent
  ) {
    const queue: Array<{ node: MailyJSONContent; parent?: MailyJSONContent }> = [{ node, parent }];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (this.hasShow(current.node)) {
        await this.handleShowNode(current.node, variables, current.parent);
      }

      if (this.isForNode(current.node)) {
        await this.handleEachNode(current.node, variables, current.parent);
      }

      if (this.isVariableNode(current.node)) {
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
    variables: FullPayloadForRender,
    parent?: MailyJSONContent
  ): Promise<void> {
    const shouldShow = await this.evaluateShowCondition(variables, node);
    if (!shouldShow && parent?.content) {
      parent.content = parent.content.filter((pNode) => pNode !== node);

      return;
    }

    // @ts-ignore
    delete node.attrs[MailyAttrsEnum.SHOW_IF_KEY];
  }

  private async handleEachNode(
    node: MailyJSONContent & { attrs: { [MailyAttrsEnum.EACH_KEY]: string } },
    variables: FullPayloadForRender,
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

  private async evaluateShowCondition(
    variables: FullPayloadForRender,
    node: MailyJSONContent & { attrs: { [MailyAttrsEnum.SHOW_IF_KEY]: string } }
  ): Promise<boolean> {
    const { [MailyAttrsEnum.SHOW_IF_KEY]: showIfKey } = node.attrs;
    const parsedShowIfValue = await parseLiquid(showIfKey, variables);

    return this.stringToBoolean(parsedShowIfValue);
  }

  private processVariableNodeTypes(node: MailyJSONContent) {
    node.type = 'text'; // set 'variable' to 'text' to for Liquid to recognize it
    node.text = node.attrs?.id || '';
  }

  private isForNode(
    node: MailyJSONContent
  ): node is MailyJSONContent & { attrs: { [MailyAttrsEnum.EACH_KEY]: string } } {
    return !!(
      node.type === MailyContentTypeEnum.FOR &&
      node.attrs &&
      node.attrs[MailyAttrsEnum.EACH_KEY] !== undefined &&
      typeof node.attrs[MailyAttrsEnum.EACH_KEY] === 'string'
    );
  }

  private hasShow(
    node: MailyJSONContent
  ): node is MailyJSONContent & { attrs: { [MailyAttrsEnum.SHOW_IF_KEY]: string } } {
    return node.attrs?.[MailyAttrsEnum.SHOW_IF_KEY] !== undefined && node.attrs?.[MailyAttrsEnum.SHOW_IF_KEY] !== null;
  }

  /**
   * For 'each' node, multiply the content by the number of items in the iterable array
   * and add indexes to the placeholders.
   *
   * @example
   * node:
   * {
   *   type: 'each',
   *   attrs: { each: '{{ payload.comments }}' },
   *   content: [
   *     { type: 'variable', text: '{{ payload.comments[0].author }}' }
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
    variables: FullPayloadForRender
  ): Promise<MailyJSONContent[]> {
    const iterablePath = node.attrs[MailyAttrsEnum.EACH_KEY];
    const forEachNodes = node.content || [];
    const iterableArray = await this.getIterableArray(iterablePath, variables);

    return iterableArray.flatMap((_, index) => this.processForEachNodes(forEachNodes, iterablePath, index));
  }

  private async getIterableArray(iterablePath: string, variables: FullPayloadForRender): Promise<unknown[]> {
    const normalizedPath = iterablePath.replace(`[${MAILY_ITERABLE_MARK}]`, '');
    const iterableArrayString = await parseLiquid(normalizedPath, variables);

    try {
      const parsedArray = JSON.parse(iterableArrayString.replace(/'/g, '"'));

      if (!Array.isArray(parsedArray)) {
        throw new Error(`Iterable "${iterablePath}" is not an array`);
      }

      return parsedArray;
    } catch (error) {
      throw new Error(`Failed to parse iterable value for "${iterablePath}": ${error.message}`);
    }
  }

  private processForEachNodes(nodes: MailyJSONContent[], iterablePath: string, index: number): MailyJSONContent[] {
    return nodes.map((node) => {
      const processedNode = { ...node };

      if (this.isVariableNode(processedNode)) {
        this.processVariableNodeTypes(processedNode);

        if (processedNode.text) {
          processedNode.text = processedNode.text.replace(MAILY_ITERABLE_MARK, index.toString());
        }

        return processedNode;
      }

      if (processedNode.content?.length) {
        processedNode.content = this.processForEachNodes(processedNode.content, iterablePath, index);
      }

      return processedNode;
    });
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

  private isVariableNode(
    node: MailyJSONContent
  ): node is MailyJSONContent & { attrs: { [MailyAttrsEnum.ID]: string } } {
    return !!(
      node.type === MailyContentTypeEnum.VARIABLE &&
      node.attrs &&
      node.attrs[MailyAttrsEnum.ID] !== undefined &&
      typeof node.attrs[MailyAttrsEnum.ID] === 'string'
    );
  }
}
