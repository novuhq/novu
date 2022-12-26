import { IsMongoId } from 'class-validator';

export class DeleteMessageParams {
  @IsMongoId()
  messageId: string;
}
