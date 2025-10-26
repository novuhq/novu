import { ContextEntity } from '@novu/dal';
import { GetContextResponseDto } from './get-context-response.dto';

export function mapContextEntityToDto(context: ContextEntity): GetContextResponseDto {
  return {
    createdAt: context.createdAt,
    updatedAt: context.updatedAt,
    type: context.type,
    id: context.id,
    data: context.data,
  };
}
