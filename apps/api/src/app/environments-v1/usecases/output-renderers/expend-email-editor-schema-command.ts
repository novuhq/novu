// Define the command interface

import { BaseCommand } from '@novu/application-generic';
import { TipTapNode } from '@novu/shared';

export class ExpendEmailEditorSchemaCommand extends BaseCommand {
  schema: TipTapNode;
}
