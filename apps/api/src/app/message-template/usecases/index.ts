import { DeleteMessageTemplate } from './delete-message-template/delete-message-template.usecase';
import { CreateMessageTemplate } from './create-message-template/create-message-template.usecase';
import { FindMessageTemplatesByLayoutUseCase } from './find-message-templates-by-layout/find-message-templates-by-layout.use-case';
import { UpdateMessageTemplate } from './update-message-template/update-message-template.usecase';

export * from './create-message-template';
export * from './find-message-templates-by-layout';
export * from './update-message-template';

export const USE_CASES = [
  CreateMessageTemplate,
  FindMessageTemplatesByLayoutUseCase,
  UpdateMessageTemplate,
  DeleteMessageTemplate,
];
