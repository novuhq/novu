// Define the command interface

import { BaseCommand } from '@novu/application-generic';
import { TipTapNode } from '@novu/shared';

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface ExpendEmailEditorSchemaCommand extends BaseCommand {
  schema: TipTapNode;
}
